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
