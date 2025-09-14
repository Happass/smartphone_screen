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
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
  const [showCameraSelector, setShowCameraSelector] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [arStatus, setArStatus] = useState('初期化中...')
  const [detectedMarkers, setDetectedMarkers] = useState('なし')
  const [cameraStatus, setCameraStatus] = useState('確認中...')
  const [modelStatus, setModelStatus] = useState('読み込み中...')
  const [recognitionAccuracy, setRecognitionAccuracy] = useState('測定中...')
  const [frameRate, setFrameRate] = useState(0)
  

  // カメラデバイスを取得する関数
  const getCameraDevices = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 60, max: 60 },
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
      console.log('カメラ切り替え開始:', cameraId)
      
      const constraints = {
        video: {
          deviceId: { exact: cameraId },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 60, max: 60 },
          facingMode: isMobile() ? { ideal: 'environment' } : undefined,
          aspectRatio: { ideal: 16/9 }
        }
      }
      
      // 既存のストリームを停止
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setCameraStream(stream)
      setCurrentCameraId(cameraId)
      setShowCameraSelector(false)
      
      // AR.jsのカメラを更新 - より強力な方法
      const updateARJSCamera = () => {
        const scene = document.querySelector('a-scene') as any
        if (!scene) {
          console.log('AR.js sceneが見つかりません')
          return false
        }

        // 複数の方法でvideo要素を探す
        let videoElement = scene.querySelector('video')
        if (!videoElement) {
          // AR.jsの内部構造を直接探す
          const arjsComponent = scene.components?.arjs
          if (arjsComponent?.videoElement) {
            videoElement = arjsComponent.videoElement
          }
        }

        if (videoElement) {
          // 既存のストリームを停止
          if (videoElement.srcObject) {
            const oldStream = videoElement.srcObject as MediaStream
            oldStream.getTracks().forEach(track => track.stop())
          }
          
          // 新しいストリームを設定
          videoElement.srcObject = stream
          
          // AR.jsの設定も更新
          const arjsComponent = scene.components?.arjs
          if (arjsComponent) {
            arjsComponent.videoElement = videoElement
            // AR.jsに再初期化を促す
            if (arjsComponent.update) {
              arjsComponent.update()
            }
          }
          
          // 強制的に再生を開始
          videoElement.play().catch(e => console.log('Video play error:', e))
          
          // 少し待ってからAR.jsの再描画を促す
          setTimeout(() => {
            if (scene.renderer) {
              scene.renderer.render(scene.object3D, scene.camera)
            }
          }, 100)
          
          console.log('AR.jsカメラ更新完了')
          setCameraStatus(`カメラ切り替え完了: ${cameraId}`)
          return true
        } else {
          console.log('AR.js video要素が見つかりません')
          return false
        }
      }

      // 即座に試行
      if (!updateARJSCamera()) {
        // 失敗した場合は複数回再試行
        let retryCount = 0
        const maxRetries = 5
        const retryInterval = setInterval(() => {
          retryCount++
          if (updateARJSCamera() || retryCount >= maxRetries) {
            clearInterval(retryInterval)
            if (retryCount >= maxRetries) {
              setCameraStatus('カメラ切り替え失敗: 最大再試行回数に達しました')
            }
          }
        }, 300)
      }
      
    } catch (error) {
      console.error('カメラの切り替えに失敗しました:', error)
      setCameraStatus('カメラ切り替え失敗')
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
    // カメラストリームを停止
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    
    setShowAR(false)
    setShowCameraSelector(false)
    setArStatus('初期化中...')
    setDetectedMarkers('なし')
    setCameraStatus('確認中...')
    setModelStatus('読み込み中...')
    setRecognitionAccuracy('測定中...')
    setFrameRate(0)
    setCurrentCameraId(null)
  }

  // AR.jsの初期化
  useEffect(() => {
    if (showAR) {
      const scene = document.querySelector('a-scene')
      if (scene) {
        scene.addEventListener('loaded', () => {
          console.log('AR.js scene loaded')
          setArStatus('AR.js 初期化完了')
          
          // テクスチャ品質の最適化
          const renderer = (scene as any).renderer
          if (renderer) {
            renderer.textureQuality = 'high'
            renderer.maxTextureSize = 2048
            console.log('テクスチャ品質を最適化しました')
          }

          // 環境光の最適化
          const camera = scene.querySelector('a-camera')
          if (camera) {
            camera.setAttribute('exposure', '1.0')
            camera.setAttribute('toneMapping', 'ACESFilmicToneMapping')
            console.log('環境光設定を最適化しました')
          }
          
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
        let recognitionCount = 0
        let totalFrames = 0
        
        markers.forEach((marker, index) => {
          marker.addEventListener('markerFound', (event: any) => {
            console.log(`マーカー ${index} 認識されました`)
            setDetectedMarkers(`マーカー ${index} 認識中`)
            
            // 認識精度の計算
            if (event.detail && event.detail.confidence) {
              const confidence = event.detail.confidence
              setRecognitionAccuracy(`信頼度: ${(confidence * 100).toFixed(1)}%`)
            } else {
              // デフォルトの信頼度表示
              setRecognitionAccuracy(`マーカー ${index} 認識中`)
            }
            recognitionCount++
          })
          
          marker.addEventListener('markerLost', () => {
            console.log(`マーカー ${index} 見失いました`)
            setDetectedMarkers('なし')
            setRecognitionAccuracy('マーカー待機中...')
          })
        })

        // フレームレート監視
        let frameCount = 0
        let lastTime = performance.now()
        const frameRateInterval = setInterval(() => {
          const currentTime = performance.now()
          const deltaTime = currentTime - lastTime
          const currentFrameRate = Math.round((frameCount * 1000) / deltaTime)
          setFrameRate(currentFrameRate)
          
          // 認識精度の計算
          if (totalFrames > 0) {
            const accuracy = (recognitionCount / totalFrames) * 100
            setRecognitionAccuracy(`認識率: ${accuracy.toFixed(1)}%`)
          }
          
          // リセット
          frameCount = 0
          lastTime = currentTime
        }, 1000)

        // フレームカウンター
        const countFrame = () => {
          frameCount++
          totalFrames++
        }
        
        // アニメーションループでフレームをカウント
        const animate = () => {
          countFrame()
          requestAnimationFrame(animate)
        }
        animate()

        // 3Dモデルの読み込み状態を監視
        const gltfModels = scene.querySelectorAll('a-gltf-model')
        console.log(`Found ${gltfModels.length} GLTF/GLB models to monitor`)
        
        gltfModels.forEach((model, index) => {
          console.log(`Setting up listeners for model ${index + 1}`)
          
          model.addEventListener('model-loaded', () => {
            console.log(`3Dモデル ${index + 1} 読み込み完了`)
            setModelStatus('3Dモデル読み込み完了')
          })
          
          model.addEventListener('error', (event: any) => {
            console.error(`3Dモデル ${index + 1} 読み込みエラー:`, event.detail)
            setModelStatus(`3Dモデル読み込みエラー: ${event.detail}`)
          })
          
          // 追加のデバッグ情報
          model.addEventListener('loaded', () => {
            console.log(`Model ${index + 1} loaded event fired`)
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
        }, 100)

        // クリーンアップ
        return () => {
          clearInterval(checkMarkers)
          clearInterval(frameRateInterval)
          // アニメーションループは自動的に停止される
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
          <button
            onClick={() => {
              // AR.jsの強制再初期化
              const scene = document.querySelector('a-scene') as any
              if (scene && scene.components?.arjs) {
                const arjs = scene.components.arjs
                if (arjs.videoElement && cameraStream) {
                  arjs.videoElement.srcObject = cameraStream
                  arjs.videoElement.play()
                  console.log('AR.js強制再初期化完了')
                  setCameraStatus('AR.js再初期化完了')
                }
              }
            }}
            className="ar-button"
            style={{backgroundColor: '#ff6b35'}}
          >
            🔄 再初期化
          </button>
        </div>

        {/* カメラ選択器 */}
        {showCameraSelector && (
          <div className="camera-selector">
            <h3>カメラを選択</h3>
            <select
              value={currentCameraId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  applyCameraSelection(e.target.value)
                }
              }}
            >
              <option value="">カメラを選択してください</option>
              {availableCameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `カメラ ${index + 1}`}
                </option>
              ))}
            </select>
            <div className="mt-2 text-sm text-gray-300">
              利用可能なカメラ: {availableCameras.length}台
            </div>
            <button
              onClick={() => setShowCameraSelector(false)}
              className="mt-3"
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
          <div>利用可能カメラ: {availableCameras.length}台</div>
          <div>現在のカメラ: {currentCameraId ? '選択済み' : '未選択'}</div>
          <div>ストリーム状態: {cameraStream ? 'アクティブ' : '停止'}</div>
          <div>3Dモデル状態: {modelStatus}</div>
          <div>認識精度: {recognitionAccuracy}</div>
          <div>フレームレート: {frameRate} FPS</div>
        </div>

        {/* A-Frame AR Scene */}
          {/* @ts-expect-error A-Frame type definitions */}
        <a-scene
          vr-mode-ui="enabled: false;"
          renderer="logarithmicDepthBuffer: false; colorManagement: false; antialias: false; textureQuality: high;"
          embedded
          arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: true; detectionMode: mono; matrixCodeType: 3x3; sourceWidth: 1280; sourceHeight: 720; displayWidth: 1280; displayHeight: 720; maxDetectionRate: 60; canvasWidth: 1280; canvasHeight: 720;"
          id="arScene"
        >
           {/* Pattern 0 */}
           {/* @ts-expect-error A-Frame type definitions */}
            <a-marker id="custom-marker-0" type="pattern" url="/markers/pattern1.patt" 
              smooth="true" 
              smoothCount="10" 
              smoothTolerance="0.01" 
              smoothThreshold="5"
              emitevents="true"
              size="1"
              minConfidence="0.6">
              {/* @ts-expect-error A-Frame type definitions */}
              <a-gltf-model src="/models/scene.glb" scale="0.5 0.5 0.5" position="0 1 0"></a-gltf-model>
              {/* @ts-expect-error A-Frame type definitions */}
           </a-marker>

            {/* Pattern 1 */}
            {/* @ts-expect-error A-Frame type definitions */}
            <a-marker id="custom-marker-1" type="pattern" url="/markers/pattern2.patt"
              smooth="true" 
              smoothCount="10" 
              smoothTolerance="0.01" 
              smoothThreshold="5"
              emitevents="true"
              size="1"
              minConfidence="0.6">
             {/* @ts-expect-error A-Frame type definitions */}
             <a-gltf-model src="/models/scene.glb" scale="0.5 0.5 0.5" position="0 1 0"></a-gltf-model>
             {/* @ts-expect-error A-Frame type definitions */}
           </a-marker>

            {/* Pattern 2 */}
            {/* @ts-expect-error A-Frame type definitions */}
            <a-marker id="custom-marker-2" type="pattern" url="/markers/pattern3.patt"
              smooth="true" 
              smoothCount="10" 
              smoothTolerance="0.01" 
              smoothThreshold="5"
              emitevents="true"
              size="1"
              minConfidence="0.6">
             {/* @ts-expect-error A-Frame type definitions */}
             <a-gltf-model src="/models/scene.glb" scale="0.5 0.5 0.5" position="0 1 0"></a-gltf-model>
             {/* @ts-expect-error A-Frame type definitions */}
           </a-marker>
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
          href="/markers/pattern.patt" 
          target="_blank"
          className="text-primary hover:text-primary/80 underline transition-colors duration-200"
        >
          Pattern 0 マーカーをダウンロード
        </a>
        <a 
          href="/markers/pattern1.patt" 
          target="_blank"
          className="text-primary hover:text-primary/80 underline transition-colors duration-200"
        >
          Pattern 1 マーカーをダウンロード
        </a>
        <a 
          href="/markers/pattern2.patt" 
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