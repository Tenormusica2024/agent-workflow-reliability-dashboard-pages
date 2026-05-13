# Compact-window dashboard layout notes

## 調査日

2026-05-13

## 参照したベストプラクティス

- W3C WCAG Reflow: 小さい viewport / 拡大表示では、ページ全体に二方向スクロールを発生させず、通常コンテンツは縦方向に reflow する。データテーブルやグリッドのように二次元構造が意味を持つ領域は例外だが、その場合もページ全体ではなく該当コンテナ内にスクロールを閉じ込めるのが望ましい。
  - https://www.w3.org/WAI/WCAG21/Understanding/reflow
- Material Design responsive layout: 画面サイズに応じてグリッド、余白、サイドパネルの扱いを変える。サイドナビは広い画面では permanent、小さい画面では content を圧迫しない形へ変える。
  - https://m1.material.io/layout/responsive-ui.html
- MDN Responsive Design: media query / breakpoint で viewport 条件に合わせたレイアウトへ切り替える。狭い画面では単純な1カラムを土台にし、十分な幅がある場合だけ複数カラムにする。
  - https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
- Carbon Design System Data Table: dense data table は十分な幅を優先する。狭い場所では無理に詰め込まず、必要なら専用領域・サイドパネル・データテーブルへ逃がす。列タイトルは短く保つ。
  - https://carbondesignsystem.com/components/data-table/usage/
- Carbon Design System Tabs: 狭い領域で横方向の項目を多段折り返しにせず、横スクロールや auto-width へ逃がす考え方が示されている。
  - https://carbondesignsystem.com/components/tabs/usage/

## このプロトタイプで採用した方針

1. 最大化時の v2 風レイアウトは維持する。
2. 小ウィンドウでは「全パネルを一画面に押し込む」のをやめ、縦スクロールのダッシュボードへ切り替える。
3. ページ全体の横スクロールは出さない。
4. Trace Tree / Waterfall / Logs / Evaluations など、二次元性が意味を持つ dense panels だけ内部スクロールを許可する。
5. サイドバーは小ウィンドウでアイコンレール化し、本文幅を確保する。
6. 1280〜1500px程度では、上段を Trace Tree + RCA の2カラムにして、最初の視界で「異常箇所」と「原因推定」を同時に見せる。
7. 1180px未満では、パネルを1カラムに積み上げる。
8. 高さ900px以下でも compact mode に入り、下部見切れではなく縦スクロールで全パネルへアクセスできるようにする。

## 実装メモ

- `@media (max-width: 1500px), (max-height: 900px)` で compact mode に切り替え。
- compact mode では sidebar を 72px の icon rail にする。
- compact mode の main area は `Trace Tree + RCA`、次に `Waterfall`。
- bottom area は `Payload + Evaluations`、次に `Replay + Logs`。
- `@media (max-width: 1180px)` で全パネルを1カラム化。
- Dense table / timeline はコンテナ内の `overflow-x: auto` に閉じ込め、page-level horizontal scroll を避ける。

## Mobile-specific update 2026-05-13

追加でモバイル表示を以下の方針に寄せた。

- Material Design の bottom navigation 方針に合わせ、スマホ幅では左サイドバーを固定の下部ナビへ変換する。
  - Material Design は bottom navigation を mobile primarily とし、3〜5個の top-level destinations に向くとしている。
  - このため、スマホでは主要5項目だけを下部ナビに出し、残りの `再実行` / `アラート` / settings 系は表示優先度を下げた。
  - 参照: https://m1.material.io/components/bottom-navigation.html
- WCAG 2.2 Target Size Minimum に合わせ、スマホ幅の主要ボタンは 44px 前後以上のタップ領域を確保する。
  - WCAG 2.2 SC 2.5.8 は少なくとも 24 x 24 CSS px の target / spacing を求める。
  - 実装上は主要操作を 44px 以上に寄せ、誤タップ耐性を優先した。
  - 参照: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Android accessibility guidance / Material accessibility の考え方に合わせ、アイコン自体ではなく周辺 padding を含む touch target を確保する。
  - 参照: https://support.google.com/accessibility/android/answer/7101858?hl=en
- スマホではページ全体の横スクロールを禁止し、Trace Tree / Waterfall のような dense panel のみ内部横スクロールにする。
- スマホの情報優先順位は `Incident summary -> Trace Tree -> RCA -> Waterfall -> Payload/Eval/Replay/Logs` とした。
  - 最初の1画面では「何が起きているか」と「どの trace が怪しいか」を優先する。
  - 原因推定は Trace Tree の直後に置き、モバイルでも triage 作業の流れが途切れないようにした。
- `max-width: 760px` でスマホ専用表示へ切り替える。
  - さらに `max-width: 420px` では言語切替と confidence card を縦積みにして横はみ出しを避ける。
