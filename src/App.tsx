import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

// モバイルデバイスかどうかを判定
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

// カメラデバイスの型定義
interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

function App() {
  const [showAR, setShowAR] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [arStatus, setArStatus] = useState("初期化中...");
  const [detectedMarkers, setDetectedMarkers] = useState("なし");
  const [cameraStatus, setCameraStatus] = useState("確認中...");
  const [modelStatus, setModelStatus] = useState("読み込み中...");
  const [recognitionAccuracy, setRecognitionAccuracy] = useState("測定中...");
  const [frameRate, setFrameRate] = useState(0);

  // カメラデバイスを取得する関数
  const getCameraDevices = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 60, max: 60 },
          facingMode: isMobile() ? { ideal: "environment" } : "user",
          aspectRatio: { ideal: 16 / 9 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");

      setAvailableCameras(videoDevices);

      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("カメラデバイスの取得に失敗しました:", error);
    }
  };

  // カメラ選択を適用
  const applyCameraSelection = async (cameraId: string) => {
    try {
      console.log("カメラ切り替え開始:", cameraId);

      const constraints = {
        video: {
          deviceId: { exact: cameraId },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 60, max: 60 },
          facingMode: isMobile() ? { ideal: "environment" } : undefined,
          aspectRatio: { ideal: 16 / 9 },
        },
      };

      // 既存のストリームを停止
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setCurrentCameraId(cameraId);
      setShowCameraSelector(false);

      // AR.jsのカメラを更新 - より強力な方法
      const updateARJSCamera = () => {
        const scene = document.querySelector("a-scene") as any;
        if (!scene) {
          console.log("AR.js sceneが見つかりません");
          return false;
        }

        // 複数の方法でvideo要素を探す
        let videoElement = scene.querySelector("video");
        if (!videoElement) {
          // AR.jsの内部構造を直接探す
          const arjsComponent = scene.components?.arjs;
          if (arjsComponent?.videoElement) {
            videoElement = arjsComponent.videoElement;
          }
        }

        if (videoElement) {
          // 既存のストリームを停止
          if (videoElement.srcObject) {
            const oldStream = videoElement.srcObject as MediaStream;
            oldStream.getTracks().forEach((track) => track.stop());
          }

          // 新しいストリームを設定
          videoElement.srcObject = stream;

          // AR.jsの設定も更新
          const arjsComponent = scene.components?.arjs;
          if (arjsComponent) {
            arjsComponent.videoElement = videoElement;
            // AR.jsに再初期化を促す
            if (arjsComponent.update) {
              arjsComponent.update();
            }
          }

          // 強制的に再生を開始
          videoElement.play().catch((e: any) => console.log("Video play error:", e));

          // 少し待ってからAR.jsの再描画を促す
          setTimeout(() => {
            if (scene.renderer) {
              scene.renderer.render(scene.object3D, scene.camera);
            }
          }, 100);

          console.log("AR.jsカメラ更新完了");
          setCameraStatus(`カメラ切り替え完了: ${cameraId}`);
          return true;
        } else {
          console.log("AR.js video要素が見つかりません");
          return false;
        }
      };

      // 即座に試行
      if (!updateARJSCamera()) {
        // 失敗した場合は複数回再試行
        let retryCount = 0;
        const maxRetries = 5;
        const retryInterval = setInterval(() => {
          retryCount++;
          if (updateARJSCamera() || retryCount >= maxRetries) {
            clearInterval(retryInterval);
            if (retryCount >= maxRetries) {
              setCameraStatus("カメラ切り替え失敗: 最大再試行回数に達しました");
            }
          }
        }, 300);
      }
    } catch (error) {
      console.error("カメラの切り替えに失敗しました:", error);
      setCameraStatus("カメラ切り替え失敗");
      alert("カメラの切り替えに失敗しました: " + (error as Error).message);
    }
  };

  // AR機能を開始
  const startAR = async () => {
    setShowAR(true);
    await getCameraDevices();

    // デバイスモーションの許可を求める
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        console.log("デバイスモーション許可:", permission);
      } catch (error) {
        console.log("デバイスモーション許可エラー:", error);
      }
    }

    // モバイル用の初期設定
    if (isMobile()) {
      console.log("モバイルデバイスを検出しました");
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        document.body.style.webkitTransform = "translateZ(0)";
        document.body.style.transform = "translateZ(0)";
        document.body.style.willChange = "transform";
      }

      if (/Android/.test(navigator.userAgent)) {
        document.body.style.transform = "translateZ(0)";
        document.body.style.willChange = "transform";
      }
    }
  };

  // シンプルなARの初期化
  const initializeSimpleAR = (scene: any) => {
    console.log("AR機能を初期化中...");

    // 3Dモデルの読み込み状態を監視
    const arModel = scene.querySelector("a-gltf-model");
    if (arModel) {
      console.log("3Dモデル要素を発見:", arModel);

      arModel.addEventListener("model-loaded", () => {
        console.log("3Dモデル読み込み完了");
        setModelStatus("3Dモデル読み込み完了");
        setDetectedMarkers("3Dオブジェクト表示中");
      });

      arModel.addEventListener("error", (event: any) => {
        console.error("3Dモデル読み込みエラー:", event.detail);
        setModelStatus(`3Dモデル読み込みエラー: ${event.detail}`);
      });

      // 追加のイベントリスナー
      arModel.addEventListener("loaded", () => {
        console.log("3Dモデル loaded イベント発火");
        setModelStatus("3Dモデル読み込み完了");
      });

      // モデルの読み込みを強制的に開始
      setTimeout(() => {
        console.log("モデル読み込み状況をチェック中...");
        if (arModel.object3D && arModel.object3D.children.length > 0) {
          console.log("モデルは既に読み込まれています");
          setModelStatus("3Dモデル読み込み完了");
          setDetectedMarkers("3Dオブジェクト表示中");
        } else {
          console.log("モデルはまだ読み込まれていません");
          setModelStatus("3Dモデル読み込み中...");
        }
      }, 2000);
    } else {
      console.error("3Dモデル要素が見つかりません");
      setModelStatus("3Dモデル要素が見つかりません");
    }

    console.log("AR機能初期化完了");
  };

  // AR機能を停止
  const stopAR = () => {
    // カメラストリームを停止
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    setShowAR(false);
    setShowCameraSelector(false);
    setArStatus("初期化中...");
    setDetectedMarkers("なし");
    setCameraStatus("確認中...");
    setModelStatus("読み込み中...");
    setRecognitionAccuracy("測定中...");
    setFrameRate(0);
    setCurrentCameraId(null);
  };

  // AR.jsの初期化
  useEffect(() => {
    if (showAR) {
      const scene = document.querySelector("a-scene");
      if (scene) {
        scene.addEventListener("loaded", () => {
          console.log("AR.js scene loaded");
          setArStatus("AR.js 初期化完了");

          // テクスチャ品質の最適化
          const renderer = (scene as any).renderer;
          if (renderer) {
            renderer.textureQuality = "high";
            renderer.maxTextureSize = 2048;
            console.log("テクスチャ品質を最適化しました");
          }

          // 環境光の最適化
          const camera = scene.querySelector("a-camera");
          if (camera) {
            camera.setAttribute("exposure", "1.0");
            camera.setAttribute("toneMapping", "ACESFilmicToneMapping");
            console.log("環境光設定を最適化しました");
          }

          // カメラ状態を確認
          const arjs = (scene as any).components.arjs;
          if (arjs && arjs.videoElement && arjs.videoElement.srcObject) {
            setCameraStatus("カメラ接続済み");
          } else {
            setCameraStatus("カメラ未接続");
          }

          // シンプルなARの初期化
          initializeSimpleAR(scene);
        });

        // AR.jsの初期化完了を待つ
        scene.addEventListener("arjs-video-loaded", () => {
          console.log("AR.js video loaded");
          setCameraStatus("AR.js カメラ初期化完了");

          // カメラの向き追跡を有効化
          const camera = scene.querySelector("a-entity[camera]");
          if (camera) {
            camera.setAttribute("look-controls", "enabled: true; pointerLockEnabled: false; touchEnabled: true;");
            console.log("カメラの向き追跡を有効化しました");
          }

          // AR.jsの追跡設定を確認・調整
          const arjs = (scene as any).components?.arjs;
          if (arjs) {
            console.log("AR.js 追跡設定:", arjs);
            // 追跡精度を向上させる設定
            if (arjs.trackingMethod) {
              console.log("追跡方法:", arjs.trackingMethod);
            }
          }
        });

        // AR状態の監視
        const checkARStatus = () => {
          const arModel = scene.querySelector("a-gltf-model") as any;
          if (arModel) {
            // モデルが読み込まれているかチェック
            if (arModel.object3D && arModel.object3D.children.length > 0) {
              setDetectedMarkers("3Dオブジェクト表示中");
              setModelStatus("3Dモデル表示中");
              setRecognitionAccuracy("AR表示中");
            } else {
              setDetectedMarkers("3Dオブジェクト読み込み中");
              setModelStatus("3Dモデル読み込み中");
              setRecognitionAccuracy("読み込み中...");
            }
          }
        };

        // フレームレート監視
        let frameCount = 0;
        let lastTime = performance.now();
        const frameRateInterval = setInterval(() => {
          const currentTime = performance.now();
          const deltaTime = currentTime - lastTime;
          const currentFrameRate = Math.round((frameCount * 1000) / deltaTime);
          setFrameRate(currentFrameRate);

          // AR状態をチェック
          checkARStatus();

          // リセット
          frameCount = 0;
          lastTime = currentTime;
        }, 1000);

        // フレームカウンター
        const countFrame = () => {
          frameCount++;
        };

        // アニメーションループでフレームをカウント
        const animate = () => {
          countFrame();
          requestAnimationFrame(animate);
        };
        animate();

        // 定期的にAR状態をチェック
        const checkARPlacement = setInterval(() => {
          checkARStatus();
        }, 100);

        // クリーンアップ
        return () => {
          clearInterval(checkARPlacement);
          clearInterval(frameRateInterval);
          // アニメーションループは自動的に停止される
        };
      }
    }
  }, [showAR]);

  // AR画面のレンダリング
  const renderARScene = () => {
    return (
      <div className="ar-container">
        {/* コントロールボタン */}
        <div className="ar-controls">
          <button onClick={stopAR} className="ar-button">
            ← 戻る
          </button>
          <button onClick={() => setShowCameraSelector(!showCameraSelector)} className="ar-button green">
            📷 カメラ選択
          </button>
          <button
            onClick={() => {
              // AR.jsの強制再初期化
              const scene = document.querySelector("a-scene") as any;
              if (scene && scene.components?.arjs) {
                const arjs = scene.components.arjs;
                if (arjs.videoElement && cameraStream) {
                  arjs.videoElement.srcObject = cameraStream;
                  arjs.videoElement.play();
                  console.log("AR.js強制再初期化完了");
                  setCameraStatus("AR.js再初期化完了");
                }
              }
            }}
            className="ar-button"
            style={{ backgroundColor: "#ff6b35" }}
          >
            🔄 再初期化
          </button>
        </div>

        {/* カメラ選択器 */}
        {showCameraSelector && (
          <div className="camera-selector">
            <h3>カメラを選択</h3>
            <select
              value={currentCameraId || ""}
              onChange={(e) => {
                if (e.target.value) {
                  applyCameraSelection(e.target.value);
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
            <div className="mt-2 text-sm text-gray-300">利用可能なカメラ: {availableCameras.length}台</div>
            <button onClick={() => setShowCameraSelector(false)} className="mt-3">
              閉じる
            </button>
          </div>
        )}

        {/* デバッグ情報 */}
        <div className="debug-info">
          <div>AR.js Status: {arStatus}</div>
          <div>3Dモデル状態: {detectedMarkers}</div>
          <div>カメラ状態: {cameraStatus}</div>
          <div>利用可能カメラ: {availableCameras.length}台</div>
          <div>現在のカメラ: {currentCameraId ? "選択済み" : "未選択"}</div>
          <div>ストリーム状態: {cameraStream ? "アクティブ" : "停止"}</div>
          <div>モデル配置: {modelStatus}</div>
          <div>操作: {recognitionAccuracy}</div>
          <div>フレームレート: {frameRate} FPS</div>
          <div style={{ color: "#4CAF50", fontWeight: "bold" }}>📱 スマートフォンを動かして3Dオブジェクトが追従することを確認してください</div>
        </div>

        {/* A-Frame AR Scene - Simple Overlay */}
        {/* @ts-expect-error A-Frame type definitions */}
        <a-scene 
          embedded 
          arjs="sourceType: webcam; videoTexture: true; debugUIEnabled: false; trackingMethod: best; detectionMode: mono; matrixCodeType: 3x3; sourceWidth: 1280; sourceHeight: 720; displayWidth: 1280; displayHeight: 720; maxDetectionRate: 60;"
          vr-mode-ui="enabled: false" 
          renderer="logarithmicDepthBuffer: true; colorManagement: true;"
        >
          {/* Camera with look controls enabled */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-entity 
            camera 
            look-controls="enabled: true; pointerLockEnabled: false; touchEnabled: true;"
            wasd-controls="enabled: false"
            position="0 0 0"
          >
            {/* @ts-expect-error A-Frame type definitions */}
          </a-entity>

          {/* Light */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-light type="ambient" color="#404040" intensity="0.6"></a-light>
          {/* @ts-expect-error A-Frame type ions */}
          <a-light type="directional" position="0 1 0" color="#ffffff" intensity="0.8"></a-light>

          {/* 3D Model overlaid on camera */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-gltf-model 
            src="/models/scene.glb" 
            scale="0.25 -0.25 0.25" 
            position="0 0 -2" 
            rotation="0 0 0" 
            id="ar-model"
          >
            {/* @ts-expect-error A-Frame type definitions */}
          </a-gltf-model>
          {/* @ts-expect-error A-Frame type definitions */}
        </a-scene>
      </div>
    );
  };

  // AR画面を表示中の場合
  if (showAR) {
    return renderARScene();
  }

  // メイン画面
  return (
    <div className="max-w-5xl mx-auto p-8 text-center">
      <div className="flex justify-center items-center gap-8 mb-8">
        <a href="https://vite.dev" target="_blank" className="block">
          <img src={viteLogo} className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] will-change-transform" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" className="block">
          <img src={reactLogo} className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] will-change-transform animate-spin-slow" alt="React logo" />
        </a>
      </div>

      <h1 className="text-4xl font-bold mb-8 text-foreground">シンプル AR アプリ</h1>

      <div className="p-8 bg-card rounded-lg shadow-lg mb-8">
        <button onClick={startAR} className="bg-blue-600 hover:bg-blue-700 text-white border-none px-8 py-4 rounded-lg text-base cursor-pointer mb-5 transition-colors duration-200 font-medium">
          🎯 AR体験を開始
        </button>

        <p className="text-muted-foreground mt-4">カメラの映像の上に3Dモデルを重ねて表示します</p>
      </div>

      <div className="bg-muted/50 p-6 rounded-lg mb-8">
        <h3 className="text-xl font-semibold mb-4 text-foreground">使用方法:</h3>
        <ul className="text-left max-w-2xl mx-auto space-y-2 text-foreground">
          <li>「AR体験を開始」ボタンをクリック</li>
          <li>カメラの許可を求められた場合は「許可」をクリック</li>
          <li>カメラの映像の上に3Dモデルが表示されます</li>
          <li>スマートフォンを動かして、3Dモデルを360度から見ることができます</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
