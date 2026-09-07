# TANGO-CHO2

**単語帳 × BYOK AI × 4択クイズ × DAILY 5 WORDS** の英語学習PWAです。

TANGO-CHOをベースに、従来の **Fortune(EN)** を廃止し、
毎日5語をAIが選ぶ **5 WORDS** を新しい語彙発見の入口として統合しました。

**Live Demo**  
https://masato-nasu.github.io/TANGO-CHO2/

---

## コンセプト

英語学習の流れを、

**見つける → 拾う → 補完する → 保存する → 繰り返す**

という短い導線にまとめています。

TANGO-CHO2では、毎日5語と、その5語すべてを使った1つの英文を生成します。
知らない単語だけをタップして、そのまま自分の単語帳へ追加できます。

---

## 主な機能

### DAILY 5 WORDS

- AIが毎日5語を選択
- 既にTANGO-CHO2へ登録している単語は、可能な限り避けて生成
- レベルを選択可能
  - 中学生向き
  - 高校・大学受験
  - 大人 / TOEIC 800+
- 5語すべてを使った **ONE SENTENCE** を生成
- 日本語訳も表示
- 単語をタップすると「追加」画面へ送る
- 同じ日の生成結果は端末内に保存

### 例文の統一

TANGO-CHO2では、同じ単語に対して例文がバラバラにならないようにしています。

- 5 WORDSから単語を拾った場合
  - その日の **ONE SENTENCE** を例文として記憶
- 「AIで空欄を補完」から例文を作った場合
  - その例文を記憶
- 以後、同じ単語では保存済みの例文を再利用

最初に作られた例文を、その単語の基準となる例文として扱います。

### 単語帳

- 英単語・日本語訳を保存
- 例文
- メモ
- 類義語
- タグ
- 品詞候補
- 学習状態
  - デフォルト
  - 覚えてない
  - うろ覚え
  - 覚えた

### BYOK AI

利用者自身のOpenAI APIキーを使います。

- AI翻訳
- AI空欄補完
- 類義語取得
- 例文生成
- ニュアンスメモ生成

APIキーはGitHubやソースコードには保存されません。

### 4択クイズ

保存した単語から4択クイズを作成します。

- 英 → 日
- 日 → 英
- カテゴリ別出題
- ランダム出題

### その他

- 発音読み上げ
- JSONエクスポート / インポート
- PWA対応
- iPhone / Android対応
- Princeton WordNetベースの品詞候補表示

---

## TANGO-CHOからの主な変更点

| TANGO-CHO | TANGO-CHO2 |
| --- | --- |
| Fortune(EN) | DAILY 5 WORDS |
| 英文占いから単語を拾う | AIが毎日5語を選び、1文にまとめる |
| 例文生成は各機能ごと | 同じ単語では例文を共有・再利用 |
| TANGO-CHO用データ | TANGO-CHO2用データとして分離 |

元のTANGO-CHOはそのまま残しており、TANGO-CHO2は独立したアプリとして運用します。

---

## AI設定（BYOK）

1. 「追加」画面の **⚙️ AI設定（BYOK）** を開く
2. OpenAI APIキーを入力
3. モデル名と例文レベルを確認
4. **接続テスト**
5. **設定を保存**

初期モデルは `gpt-5-mini` です。

API利用料金は、入力したAPIキーのOpenAIアカウントに発生します。
公共・共有端末ではAPIキーを保存しないでください。

---

## 使い方

### 1. 5 WORDSを作る

**5 WORDS** タブを開き、レベルを選んで **今日の5語を生成** を押します。

### 2. 知らない単語を拾う

5語の中から覚えたい単語をタップすると、「追加」画面へ移動します。

- 日本語訳
- メモ
- ONE SENTENCE
- `5WORDS` タグ

が自動的に引き継がれます。

### 3. 必要ならAIで補完

不足している項目は **AIで空欄を補完** で追加できます。
既にその単語の例文が記憶されている場合は、同じ例文を使います。

### 4. 保存してクイズで復習

単語帳へ保存した後、4択クイズやランダム機能で復習します。

---

## PWAとしてインストール

### iPhone / iPad

Safariで以下を開きます。

https://masato-nasu.github.io/TANGO-CHO2/

**共有 → ホーム画面に追加**

### Android

Chromeで以下を開きます。

https://masato-nasu.github.io/TANGO-CHO2/

メニューから **アプリをインストール** または **ホーム画面に追加** を選びます。

---

## データ保存

単語帳や5 WORDSの生成結果は、基本的に端末のブラウザストレージへ保存されます。

TANGO-CHO2は、元のTANGO-CHOと同じ `github.io` ドメイン上で動作する場合でも、単語帳データをTANGO-CHO2側のキーへ分離して扱います。

初回のみ、既存TANGO-CHOのデータがある場合はTANGO-CHO2へコピーし、その後は別々に管理します。

---

## プライバシー

- 単語帳データは基本的に端末内へ保存
- AI機能を使ったときだけ、必要なテキストをOpenAI APIへ送信
- OpenAI APIキーはGitHubへ送信・保存しない
- APIキーは単語帳バックアップJSONに含めない

---

## Third-party licenses

### Princeton WordNet

本アプリは、Princeton WordNet のデータに基づく品詞ワードリストを同梱しています。

WordNet License / Terms of Use  
https://wordnet.princeton.edu/license-and-commercial-use

同梱ライセンス: [`data/WORDNET_LICENSE.txt`](data/WORDNET_LICENSE.txt)

---

## TANGO-CHO2 v0.1.0

- Fortune(EN)をDAILY 5 WORDSへ置き換え
- 既登録語を避ける5語生成
- 5語すべてを使うONE SENTENCE
- 5 WORDSから単語帳への直接取り込み
- TANGO-CHO2専用ストレージ
- 5 WORDSとAI補完の例文同期
- 元のTANGO-CHOを変更せず独立運用
