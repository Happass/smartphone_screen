import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'


// モバイルデバイスかどうかを判定
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 768);
}

// カメラデバイスの型定義
interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

function App() {
  const [showAR, setShowAR] = useState(false)
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([])
  const [, setCurrentCameraId] = useState<string | null>(null)
  const [showCameraSelector, setShowCameraSelector] = useState(false)
  const [arStatus, setArStatus] = useState('初期化中...')
  const [detectedMarkers, setDetectedMarkers] = useState('なし')
  const [cameraStatus, setCameraStatus] = useState('確認中...')
  const [modelStatus, setModelStatus] = useState('読み込み中...')
  

  // カメラデバイスを取得する関数
  const getCameraDevices = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: isMobile() ? { ideal: 'environment' } : 'user',
          aspectRatio: { ideal: 16/9 }
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      setAvailableCameras(videoDevices)
      
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.error('カメラデバイスの取得に失敗しました:', error)
    }
  }

  // カメラ選択を適用
  const applyCameraSelection = async (cameraId: string) => {
    try {
      const constraints = {
        video: {
          deviceId: { exact: cameraId },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: isMobile() ? { ideal: 'environment' } : undefined,
          aspectRatio: { ideal: 16/9 }
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setCurrentCameraId(cameraId)
      setShowCameraSelector(false)
      
      // AR.jsのカメラを更新
      const scene = document.querySelector('a-scene') as any
      if (scene && scene.components.arjs) {
        const arjs = scene.components.arjs
        if (arjs.videoElement) {
          arjs.videoElement.srcObject = stream
        }
      }
    } catch (error) {
      console.error('カメラの切り替えに失敗しました:', error)
      alert('カメラの切り替えに失敗しました: ' + (error as Error).message)
    }
  }

  // AR機能を開始
  const startAR = async () => {
    setShowAR(true)
    await getCameraDevices()
    
    // モバイル用の初期設定
    if (isMobile()) {
      console.log('モバイルデバイスを検出しました')
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        document.body.style.webkitTransform = 'translateZ(0)'
        document.body.style.transform = 'translateZ(0)'
        document.body.style.willChange = 'transform'
      }
      
      if (/Android/.test(navigator.userAgent)) {
        document.body.style.transform = 'translateZ(0)'
        document.body.style.willChange = 'transform'
      }
    }
  }

  // AR機能を停止
  const stopAR = () => {
    setShowAR(false)
    setShowCameraSelector(false)
    setArStatus('初期化中...')
    setDetectedMarkers('なし')
    setCameraStatus('確認中...')
    setModelStatus('読み込み中...')
  }

  // AR.jsの初期化
  useEffect(() => {
    if (showAR) {
      const scene = document.querySelector('a-scene')
      if (scene) {
        scene.addEventListener('loaded', () => {
          console.log('AR.js scene loaded')
          setArStatus('AR.js 初期化完了')
          
          // カメラ状態を確認
          const arjs = (scene as any).components.arjs
          if (arjs && arjs.videoElement && arjs.videoElement.srcObject) {
            setCameraStatus('カメラ接続済み')
          } else {
            setCameraStatus('カメラ未接続')
          }
        })

        // マーカー認識の監視
        const markers = scene.querySelectorAll('a-marker')
        markers.forEach((marker, index) => {
          marker.addEventListener('markerFound', () => {
            console.log(`マーカー ${index} 認識されました`)
            setDetectedMarkers(`マーカー ${index} 認識中`)
          })
          
          marker.addEventListener('markerLost', () => {
            console.log(`マーカー ${index} 見失いました`)
            setDetectedMarkers('なし')
          })
        })

        // 3Dモデルの読み込み状態を監視
        const gltfModels = scene.querySelectorAll('a-gltf-model')
        gltfModels.forEach((model, index) => {
          model.addEventListener('model-loaded', () => {
            console.log(`3Dモデル ${index + 1} 読み込み完了`)
            setModelStatus('3Dモデル読み込み完了')
          })
          
          model.addEventListener('error', (event: any) => {
            console.error(`3Dモデル ${index + 1} 読み込みエラー:`, event.detail)
            setModelStatus(`3Dモデル読み込みエラー: ${event.detail}`)
          })
        })

        // 定期的にマーカー認識状態をチェック
        const checkMarkers = setInterval(() => {
          let detectedCount = 0
          markers.forEach((marker) => {
            if ((marker as any).object3D.visible) {
              detectedCount++
            }
          })
          
          if (detectedCount > 0) {
            setDetectedMarkers(`${detectedCount}個のマーカーを認識`)
          } else {
            setDetectedMarkers('なし')
          }
        }, 1000)

        // クリーンアップ
        return () => {
          clearInterval(checkMarkers)
        }
      }
    }
  }, [showAR])

  // AR画面のレンダリング
  const renderARScene = () => {
    return (
      <div className="ar-container">
        {/* コントロールボタン */}
        <div className="ar-controls">
          <button
            onClick={stopAR}
            className="ar-button"
          >
            ← 戻る
          </button>
          <button
            onClick={() => setShowCameraSelector(!showCameraSelector)}
            className="ar-button green"
          >
            📷 カメラ選択
          </button>
        </div>

        {/* カメラ選択器 */}
        {showCameraSelector && (
          <div className="camera-selector">
            <h3>カメラを選択</h3>
            <select
              onChange={(e) => applyCameraSelection(e.target.value)}
            >
              <option value="">カメラを選択してください</option>
              {availableCameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `カメラ ${index + 1}`}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCameraSelector(false)}
            >
              閉じる
            </button>
          </div>
        )}

        {/* デバッグ情報 */}
        <div className="debug-info">
          <div>AR.js Status: {arStatus}</div>
          <div>認識されたマーカー: {detectedMarkers}</div>
          <div>カメラ状態: {cameraStatus}</div>
          <div>3Dモデル状態: {modelStatus}</div>
        </div>

        {/* A-Frame AR Scene */}
          {/* @ts-expect-error A-Frame type definitions */}
        <a-scene
          vr-mode-ui="enabled: false;"
          renderer="logarithmicDepthBuffer: true; colorManagement: true; antialias: true;"
          embedded
          arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: true; detectionMode: mono_and_matrix; matrixCodeType: 3x3; sourceWidth: 1280; sourceHeight: 720; displayWidth: 1280; displayHeight: 720; maxDetectionRate: 60; canvasWidth: 1280; canvasHeight: 720;"
          id="arScene"
        >
          {/* Pattern 0 */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-marker id="custom-marker-0" type="pattern" url="./markers/pattern.patt">
            {/* @ts-expect-error A-Frame type definitions */}
            <a-gltf-model src="./models/scene.gltf" scale="0.0025 0.0025 0.0025" position="0 0.5 0"></a-gltf-model>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-box position="0 0.5 0" material="color: red;" rotation="0 45 0" visible="false"></a-box>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-sphere position="1 1 0" material="color: blue;" radius="0.3" visible="false"></a-sphere>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cylinder position="-1 1 0" material="color: green;" radius="0.3" height="1" visible="false"></a-cylinder>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cone position="0 2 0" material="color: yellow;" radius-bottom="0.5" height="1" visible="false"></a-cone>
            {/* End of Pattern 0 marker */}
            {/* @ts-expect-error A-Frame type definitions */}
          </a-marker>
          {/* End of Pattern 0 marker */}

          {/* Pattern 1 */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-marker id="custom-marker-1" type="pattern" url="./markers/pattern1.patt">
            {/* @ts-expect-error A-Frame type definitions */}
            <a-gltf-model src="./models/scene.gltf" scale="0.0025 0.0025 0.0025" position="0 0.5 0"></a-gltf-model>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-box position="0 0.5 0" material="color: red;" rotation="0 45 0" visible="false"></a-box>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-sphere position="1 1 0" material="color: blue;" radius="0.3" visible="false"></a-sphere>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cylinder position="-1 1 0" material="color: green;" radius="0.3" height="1" visible="false"></a-cylinder>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cone position="0 2 0" material="color: yellow;" radius-bottom="0.5" height="1" visible="false"></a-cone>
            {/* End of Pattern 1 marker */}
            {/* @ts-expect-error A-Frame type definitions */}
          </a-marker>
          {/* End of Pattern 1 marker */}

          {/* Pattern 2 */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-marker id="custom-marker-2" type="pattern" url="./markers/pattern2.patt">
            {/* @ts-expect-error A-Frame type definitions */}
            <a-gltf-model src="./models/scene.gltf" scale="0.0025 0.0025 0.0025" position="0 0.5 0"></a-gltf-model>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-box position="0 0.5 0" material="color: red;" rotation="0 45 0" visible="false"></a-box>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-sphere position="1 1 0" material="color: blue;" radius="0.3" visible="false"></a-sphere>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cylinder position="-1 1 0" material="color: green;" radius="0.3" height="1" visible="false"></a-cylinder>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cone position="0 2 0" material="color: yellow;" radius-bottom="0.5" height="1" visible="false"></a-cone>
            {/* End of Pattern 2 marker */}
            {/* @ts-expect-error A-Frame type definitions */}
          </a-marker>
          {/* End of Pattern 2 marker */}

          {/* Pattern 3 */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-marker id="custom-marker-3" type="pattern" url="./markers/pattern3.patt">
            {/* @ts-expect-error A-Frame type definitions */}
            <a-gltf-model src="./models/scene.gltf" scale="0.0025 0.0025 0.0025" position="0 0.5 0"></a-gltf-model>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-box position="0 0.5 0" material="color: red;" rotation="0 45 0" visible="false"></a-box>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-sphere position="1 1 0" material="color: blue;" radius="0.3" visible="false"></a-sphere>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cylinder position="-1 1 0" material="color: green;" radius="0.3" height="1" visible="false"></a-cylinder>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cone position="0 2 0" material="color: yellow;" radius-bottom="0.5" height="1" visible="false"></a-cone>
            {/* End of Pattern 3 marker */}
            {/* @ts-expect-error A-Frame type definitions */}
          </a-marker>

          {/* Pattern 4 */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-marker id="custom-marker-4" type="pattern" url="./markers/pattern4.patt">
            {/* @ts-expect-error A-Frame type definitions */}
            <a-gltf-model src="./models/scene.gltf" scale="0.0025 0.0025 0.0025" position="0 0.5 0"></a-gltf-model>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-box position="0 0.5 0" material="color: red;" rotation="0 45 0" visible="false"></a-box>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-sphere position="1 1 0" material="color: blue;" radius="0.3" visible="false"></a-sphere>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cylinder position="-1 1 0" material="color: green;" radius="0.3" height="1" visible="false"></a-cylinder>
            {/* @ts-expect-error A-Frame type definitions */}
            <a-cone position="0 2 0" material="color: yellow;" radius-bottom="0.5" height="1" visible="false"></a-cone>
            {/* End of Pattern 4 marker */}
            {/* @ts-expect-error A-Frame type definitions */}
          </a-marker>
          {/* End of Pattern 4 marker */}

          {/* @ts-expect-error A-Frame type definitions */}
          <a-entity camera></a-entity>
          {/* @ts-expect-error A-Frame type definitions */}
        </a-scene>
      </div>
    )
  }

  // AR画面を表示中の場合
  if (showAR) {
    return renderARScene()
  }

  // メイン画面
  return (
    <div className="max-w-5xl mx-auto p-8 text-center">
      <div className="flex justify-center items-center gap-8 mb-8">
        <a href="https://vite.dev" target="_blank" className="block">
          <img 
            src={viteLogo} 
            className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] will-change-transform" 
            alt="Vite logo" 
          />
        </a>
        <a href="https://react.dev" target="_blank" className="block">
          <img 
            src={reactLogo} 
            className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] will-change-transform animate-spin-slow" 
            alt="React logo" 
          />
        </a>
      </div>
      
      <h1 className="text-4xl font-bold mb-8 text-foreground">AR Marker Recognition App</h1>
      
      <div className="p-8 bg-card rounded-lg shadow-lg mb-8">
        <button 
          onClick={startAR} 
          className="bg-blue-600 hover:bg-blue-700 text-white border-none px-8 py-4 rounded-lg text-base cursor-pointer mb-5 transition-colors duration-200 font-medium"
        >
          🎯 AR体験を開始
        </button>
        
        <p className="text-muted-foreground mt-4">
          「AR体験を開始」ボタンをクリックして、マーカー認識機能をお試しください
        </p>
      </div>
      
      <div className="bg-muted/50 p-6 rounded-lg mb-8">
        <h3 className="text-xl font-semibold mb-4 text-foreground">使用方法:</h3>
        <ul className="text-left max-w-2xl mx-auto space-y-2 text-foreground">
          <li>AR画面が開いたら、カメラの許可を求められた場合は「許可」をクリック</li>
          <li>複数のカメラがある場合は「📷 カメラ選択」ボタンでカメラを切り替えできます</li>
          <li>Patternマーカーを印刷または画面に表示してください：</li>
          <ul className="ml-4 mt-2 space-y-1">
            <li><strong>Pattern 0-4 マーカー:</strong> 3Dモデルが表示されます</li>
          </ul>
          <li>マーカーをカメラに向けると、3Dオブジェクトが表示されます</li>
        </ul>
      </div>
      
      <div className="flex justify-center gap-4">
        <a 
          href="./markers/pattern.patt" 
          target="_blank"
          className="text-primary hover:text-primary/80 underline transition-colors duration-200"
        >
          Pattern 0 マーカーをダウンロード
        </a>
        <a 
          href="./markers/pattern1.patt" 
          target="_blank"
          className="text-primary hover:text-primary/80 underline transition-colors duration-200"
        >
          Pattern 1 マーカーをダウンロード
        </a>
        <a 
          href="./markers/pattern2.patt" 
          target="_blank"
          className="text-primary hover:text-primary/80 underline transition-colors duration-200"
        >
          Pattern 2 マーカーをダウンロード
        </a>
      </div>
    </div>
  )
}

export default App