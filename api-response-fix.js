/* TANGO-CHO v48.0.5: OpenAI Responses API fix + persistent BYOK storage */
(() => {
  const RESPONSES_URL = "https://api.openai.com/v1/responses";

  // Ask the browser to keep this origin's storage persistent when supported.
  // TANGO-CHO stores the BYOK API key in IndexedDB, so this reduces the chance
  // of the browser evicting it under storage pressure. It never sends the key
  // anywhere except the OpenAI API when an AI feature is used.
  async function requestPersistentStorage() {
    try {
      if (!navigator.storage?.persist) return false;
      if (navigator.storage.persisted && await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    } catch (_) {
      return false;
    }
  }

  // Try on load and once again after the user's first interaction. Some browsers
  // are more willing to grant persistence to an installed/engaged PWA.
  void requestPersistentStorage();
  window.addEventListener("pointerdown", () => { void requestPersistentStorage(); }, { once: true, passive: true });
  window.addEventListener("keydown", () => { void requestPersistentStorage(); }, { once: true });

  function isGpt5Family(model) {
    return /^gpt-5(?:[.\-]|$)/i.test(String(model || "").trim());
  }

  function extractResponseText(data) {
    if (typeof data?.output_text === "string" && data.output_text.trim()) {
      return data.output_text.trim();
    }

    const chunks = [];
    const output = Array.isArray(data?.output) ? data.output : [];
    for (const item of output) {
      if (typeof item?.text === "string" && item.text.trim()) chunks.push(item.text);
      const content = Array.isArray(item?.content) ? item.content : [];
      for (const part of content) {
        if (typeof part?.text === "string" && part.text.trim()) chunks.push(part.text);
        else if (typeof part?.output_text === "string" && part.output_text.trim()) chunks.push(part.output_text);
      }
    }
    return chunks.join("\n").trim();
  }

  function extractRefusal(data) {
    const output = Array.isArray(data?.output) ? data.output : [];
    for (const item of output) {
      const content = Array.isArray(item?.content) ? item.content : [];
      for (const part of content) {
        if (typeof part?.refusal === "string" && part.refusal.trim()) return part.refusal.trim();
      }
    }
    return "";
  }

  function incompleteReason(data) {
    return String(data?.incomplete_details?.reason || "").trim();
  }

  function friendlyIncompleteMessage(reason) {
    const r = String(reason || "").toLowerCase();
    if (r.includes("max")) return "AIの出力枠が不足しました。自動再試行しても完了しなかったため、もう一度お試しください。";
    if (r.includes("content_filter")) return "AIの安全確認により応答を完了できませんでした。別の単語でお試しください。";
    return "AIの応答が完了しませんでした。もう一度お試しください。";
  }

  async function requestOnce({ apiKey, model, instruction, input, maxOutputTokens, responseSchema }) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 60000) : null;

    const body = {
      model,
      instructions: instruction,
      input,
      max_output_tokens: maxOutputTokens,
      store: false,
    };

    if (responseSchema) body.text = {format:{type:"json_schema",name:"tangocho2_part5",strict:true,schema:responseSchema}};

    // GPT-5 family models otherwise default to a larger reasoning budget.
    // For dictionary tasks, minimal reasoning leaves room for the visible JSON answer.
    if (isGpt5Family(model)) body.reasoning = { effort: "minimal" };

    let res;
    try {
      res = await fetch(RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        ...(ctrl ? { signal: ctrl.signal } : {}),
      });
    } catch (e) {
      if (e?.name === "AbortError") {
        throw new Error("AIへの接続がタイムアウトしました。通信状態をご確認ください。");
      }
      throw new Error("AIへ接続できませんでした。通信状態、APIキー、ブラウザの制限をご確認ください。");
    } finally {
      if (timer) clearTimeout(timer);
    }

    const raw = await res.text().catch(() => "");
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (_) {}

    if (!res.ok) {
      if (typeof __openAiErrorMessage === "function") {
        throw new Error(__openAiErrorMessage(res.status, data, raw));
      }
      const detail = data?.error?.message || raw || "";
      throw new Error(`OpenAI APIエラー (${res.status})${detail ? `: ${detail}` : ""}`);
    }

    if (data?.status === "failed" || data?.error) {
      const detail = data?.error?.message || "AIの処理に失敗しました。";
      throw new Error(detail);
    }

    return data || {};
  }

  async function fixedCallOpenAiJson({ instruction, input, maxOutputTokens = 700, responseSchema }) {
    if (typeof ensureAiSettingsLoaded === "function") await ensureAiSettingsLoaded();

    const apiKey = typeof getOpenAiApiKey === "function" ? getOpenAiApiKey() : "";
    if (!apiKey) throw new Error("⚙️ AI設定でOpenAI APIキーを入力してください。");

    const model = typeof getOpenAiModel === "function" ? getOpenAiModel() : "";
    if (!model) throw new Error("AIモデル名を入力してください。");

    const requested = Math.max(200, Number(maxOutputTokens) || 700);
    const firstLimit = isGpt5Family(model) ? Math.max(1200, requested) : requested;

    let data = await requestOnce({
      apiKey,
      model,
      instruction,
      input,
      maxOutputTokens: firstLimit,
      responseSchema,
    });

    let outputText = extractResponseText(data);
    let reason = incompleteReason(data);

    // A reasoning model can consume the output budget before producing visible text.
    // Retry once with a larger allowance when that happens.
    if (!outputText && (data?.status === "incomplete" || reason)) {
      const retryLimit = Math.min(6000, Math.max(2400, firstLimit * 2));
      data = await requestOnce({
        apiKey,
        model,
        instruction,
        input,
        maxOutputTokens: retryLimit,
        responseSchema,
      });
      outputText = extractResponseText(data);
      reason = incompleteReason(data);
    }

    if (!outputText) {
      const refusal = extractRefusal(data);
      if (refusal) throw new Error(`AIが応答できませんでした: ${refusal}`);
      if (data?.status === "incomplete" || reason) throw new Error(friendlyIncompleteMessage(reason));
      throw new Error("AIから本文が返りませんでした。接続テストを行い、もう一度お試しください。");
    }

    if (typeof __parseAiJson === "function") return __parseAiJson(outputText);
    return JSON.parse(outputText);
  }

  // Replace the original API helper before DOMContentLoaded handlers use it.
  window.callOpenAiJson = fixedCallOpenAiJson;

  // Default AI assist fills meaning, example, and memo only.
  // Synonyms remain opt-in via the dedicated 「類義語取得」 button.
  async function enrichTermWithoutSynonyms(term, existingExample = "") {
    const level = typeof getAiLevel === "function" ? getAiLevel() : "adult";
    const levelInstruction = typeof __aiLevelInstruction === "function" ? __aiLevelInstruction(level) : "";

    if (typeof setMsg === "function") {
      setMsg("意味・例文・メモを作成しています…", "");
    }

    const result = await fixedCallOpenAiJson({
      instruction: "You are a careful English-learning dictionary editor for Japanese learners. Return only valid JSON, with no markdown. Never invent an etymology; mention origin only when well established.",
      input: `Create vocabulary-card information for the English word or phrase below. ${levelInstruction} The Japanese memo should briefly explain nuance, usage, or a reliable word origin when useful. Return exactly this JSON shape: {"meaning":"concise Japanese meaning","example":"one natural English example sentence","exampleTranslation":"natural Japanese translation of exactly that example","memo":"concise Japanese usage note"}. Do not include synonyms or a synonyms field.\n\nTerm: ${term}\n${existingExample ? `Keep this exact existing example and translate it into Japanese: ${JSON.stringify(existingExample)}` : ""}`,
      maxOutputTokens: 1100,
    });

    return {
      meaning: String(result?.meaning || "").trim(),
      synonyms: [],
      example: String(result?.example || "").trim(),
      exampleTranslation: String(result?.exampleTranslation || "").trim(),
      memo: String(result?.memo || "").trim(),
    };
  }

  window.enrichTermViaAi = enrichTermWithoutSynonyms;
})();
