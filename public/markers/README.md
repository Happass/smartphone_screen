# ARマーカーファイルの配置場所

このフォルダには、AR.jsで使用するカスタムマーカーファイルを配置します。

## ファイル形式

- **パターンファイル**: `.patt` 形式のファイル
- **画像ファイル**: `.jpg` または `.png` 形式のファイル（AR.jsが自動でパターンファイルを生成）

## マーカーファイルの作成方法

### 1. AR.js Pattern Marker Generator を使用
1. [AR.js Pattern Marker Generator](https://jeromeetienne.github.io/AR.js/three.js/examples/marker-training/examples/generator.html) にアクセス
2. マーカーにしたい画像をアップロード
3. 生成された `.patt` ファイルをこのフォルダに保存

### 2. 既存の画像を使用
- 高コントラストの画像（白黒、シンプルなデザイン）を推奨
- サイズ: 512x512px または 1024x1024px
- ファイル名: `custom-marker.jpg` または `custom-marker.png`

## 現在の設定

- `custom-marker.patt`: カスタムマーカーのパターンファイル
- URL: `./markers/custom-marker.patt`

## 注意事項

- プリセットマーカー（Hiro、Kanji）はファイルを配置する必要がありません
- カスタムマーカーを使用する場合のみ、このフォルダにファイルを配置してください
