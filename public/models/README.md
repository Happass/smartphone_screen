# 3Dモデルファイルの配置場所

このフォルダには、AR.jsで表示する3Dオブジェクトファイルを配置します。

## 対応形式

### 1. glb/GLB形式（推奨）
- **ファイル拡張子**: `.glb`, `.glb`
- **A-Frame要素**: `<a-glb-model>`
- **メリット**: 最新標準、アニメーション対応、軽量
- **作成ツール**: Blender, Maya, 3ds Max, SketchUp

```html
<a-glb-model src="./models/object.glb" scale="1 1 1" position="0 0.5 0"></a-glb-model>
```

### 2. OBJ形式
- **ファイル拡張子**: `.obj`, `.mtl`
- **A-Frame要素**: `<a-obj-model>`
- **メリット**: 汎用性が高い、多くのツールで出力可能
- **作成ツール**: ほぼ全ての3Dソフト

```html
<a-obj-model src="./models/object.obj" mtl="./models/object.mtl" scale="1 1 1"></a-obj-model>
```

### 3. COLLADA形式
- **ファイル拡張子**: `.dae`
- **A-Frame要素**: `<a-collada-model>`
- **メリット**: アニメーション対応
- **作成ツール**: Blender, Maya, 3ds Max

```html
<a-collada-model src="./models/object.dae" scale="1 1 1"></a-collada-model>
```

## ファイル配置例

```
public/models/
├── hiro-object.glb          # Hiroマーカー用の3Dオブジェクト
├── hiro-object.obj           # OBJ形式の場合
├── hiro-object.mtl           # OBJ用マテリアルファイル
├── kanji-object.glb         # Kanjiマーカー用の3Dオブジェクト
├── pattern-object.glb       # Patternマーカー用の3Dオブジェクト
└── README.md                 # このファイル
```

## 推奨設定

### ファイルサイズ
- **glb**: 1MB以下
- **OBJ**: 2MB以下
- **COLLADA**: 3MB以下

### ポリゴン数
- **モバイル**: 5,000ポリゴン以下
- **デスクトップ**: 20,000ポリゴン以下

### テクスチャ
- **解像度**: 512x512 または 1024x1024
- **形式**: JPG, PNG
- **ファイルサイズ**: 500KB以下

## 使用方法

1. 3Dモデルファイルをこのフォルダに配置
2. `ar.html`で対応するコメントアウトを外す
3. ファイルパスを正しく設定
4. スケール、位置、回転を調整

## 注意事項

- ファイル名に日本語やスペースは使用しない
- パスは相対パス（`./models/`）で指定
- モバイルでの読み込み速度を考慮してファイルサイズを最適化
- テクスチャファイルも同じフォルダに配置するか、相対パスで指定
