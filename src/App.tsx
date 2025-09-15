import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';

// モバイルデバイスかどうかを判定
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

// iPadかどうかを判定
const isIPad = () => {
  return /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
  const [modelPosition, setModelPosition] = useState({ x: 0, y: 0, z: -2 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
  const [modelRotation, setModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [quantumEnergy, setQuantumEnergy] = useState(98);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // PWA更新通知
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  // PWAインストールプロンプトの処理
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

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
      
      // iPad用の特別な処理
      if (isIPad()) {
        console.log("iPadを検出しました");
        // iPadではPWAのフルスクリーンモードを避ける
        document.body.style.webkitTransform = "translateZ(0)";
        document.body.style.transform = "translateZ(0)";
        document.body.style.willChange = "transform";
        // iPad用のビューポート設定
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=yes, maximum-scale=5.0, minimum-scale=1.0');
        }
      } else if (/iPhone|iPod/.test(navigator.userAgent)) {
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

  // カメラの向きに応じてモデルを回転させる関数
  const updateModelRotation = () => {
    const scene = document.querySelector("a-scene");
    if (!scene) return;

    const camera = scene.querySelector("a-entity[camera]");
    if (!camera) return;

    // カメラの回転を取得
    const cameraRotation = camera.getAttribute("rotation");
    if (cameraRotation) {
      // モデルをカメラの反対方向を向かせる（水平を保つ）
      // cameraRotationはstring型なので、分割してx, y, zを取得
      let x = 0, y = 0;
      if (typeof cameraRotation === "string") {
        const parts = cameraRotation.split(" ");
        x = Number(parts[0]);
        y = Number(parts[1]);
      } else if (typeof cameraRotation === "object" && cameraRotation !== null) {
        // 万が一object型で来る場合も考慮
        x = Number((cameraRotation as any).x);
        y = Number((cameraRotation as any).y);
      }
      const newRotation = {
        x: isNaN(x) ? 0 : -x,
        y: isNaN(y) ? 0 : -y,
        z: 0 // Z軸の回転は0に固定して水平を保つ
      };

      setModelRotation(newRotation);
      
      // 3Dモデルの回転を更新
      const arModel = document.querySelector("a-gltf-model");
      if (arModel) {
        arModel.setAttribute("rotation", `${newRotation.x} ${newRotation.y} ${newRotation.z}`);
      }
    }
  };

  // スワイプ操作で3Dオブジェクトを移動する関数
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setLastTouch({ x: touch.clientX, y: touch.clientY });
    console.log("タッチ開始:", touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastTouch.x;
    const deltaY = touch.clientY - lastTouch.y;
    
    // スワイプの感度を調整（小さな値で細かい調整）
    const sensitivity = 0.002;
    
    setModelPosition(prev => {
      const newX = prev.x + (deltaX * sensitivity);
      const newY = prev.y - (deltaY * sensitivity); // Y軸は反転（画面の上方向が3D空間の上方向）
      const newPosition = { x: newX, y: newY, z: prev.z };
      
      // 3Dモデルの位置を更新
      const arModel = document.querySelector("a-gltf-model");
      if (arModel) {
        arModel.setAttribute("position", `${newPosition.x} ${newPosition.y} ${newPosition.z}`);
        
        // 位置変更後にカメラの向きに合わせてモデルの回転を更新
        setTimeout(() => {
          updateModelRotation();
        }, 10);
      }
      
      return newPosition;
    });
    
    setLastTouch({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // タッチ終了時にモデルの回転を更新
    setTimeout(() => {
      updateModelRotation();
    }, 50);
    
    console.log("タッチ終了");
  };

  // マウス操作も対応（デスクトップ用）
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setLastTouch({ x: e.clientX, y: e.clientY });
    console.log("マウス開始:", e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaX = e.clientX - lastTouch.x;
    const deltaY = e.clientY - lastTouch.y;
    
    const sensitivity = 0.002;
    
    setModelPosition(prev => {
      const newX = prev.x + (deltaX * sensitivity);
      const newY = prev.y - (deltaY * sensitivity);
      const newPosition = { x: newX, y: newY, z: prev.z };
      
      const arModel = document.querySelector("a-gltf-model");
      if (arModel) {
        arModel.setAttribute("position", `${newPosition.x} ${newPosition.y} ${newPosition.z}`);
        
        // 位置変更後にカメラの向きに合わせてモデルの回転を更新
        setTimeout(() => {
          updateModelRotation();
        }, 10);
      }
      
      return newPosition;
    });
    
    setLastTouch({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // マウス終了時にモデルの回転を更新
    setTimeout(() => {
      updateModelRotation();
    }, 50);
    
    console.log("マウス終了");
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

          // モーション追跡を確実に有効化
          setTimeout(() => {
            const camera = scene.querySelector("a-entity[camera]");
            if (camera) {
              camera.setAttribute("look-controls", "enabled: true; pointerLockEnabled: false; touchEnabled: true; reverseMouseDrag: false; reverseTouchDrag: false;");
              console.log("モーション追跡を再初期化しました");
              setArStatus("モーション追跡有効");
              
              // モデルの回転を定期的に更新
              const rotationInterval = setInterval(() => {
                updateModelRotation();
              }, 100); // 100msごとに更新
              
              // クリーンアップ用にintervalを保存
              (scene as any).rotationInterval = rotationInterval;
            }
          }, 2000);
        });

        // AR.jsの初期化完了を待つ
        scene.addEventListener("arjs-video-loaded", () => {
          console.log("AR.js video loaded");
          setCameraStatus("AR.js カメラ初期化完了");

          // カメラの向き追跡を有効化
          const camera = scene.querySelector("a-entity[camera]");
          if (camera) {
            camera.setAttribute("look-controls", "enabled: true; pointerLockEnabled: false; touchEnabled: true; reverseMouseDrag: false; reverseTouchDrag: false;");
            console.log("カメラの向き追跡を有効化しました");
            
            // カメラの向き追跡を強制的に再初期化
            setTimeout(() => {
              camera.setAttribute("look-controls", "enabled: true; pointerLockEnabled: false; touchEnabled: true; reverseMouseDrag: false; reverseTouchDrag: false;");
              console.log("カメラの向き追跡を再初期化しました");
            }, 1000);
          }

          // AR.jsの追跡設定を確認・調整
          const arjs = (scene as any).components?.arjs;
          if (arjs) {
            console.log("AR.js 追跡設定:", arjs);
            // 追跡精度を向上させる設定
            if (arjs.trackingMethod) {
              console.log("追跡方法:", arjs.trackingMethod);
            }
            
            // デバイスの動き追跡を強制的に有効化
            if (arjs.videoElement) {
              console.log("AR.js video element found");
              
              // カメラの向き追跡を再設定
              const camera = scene.querySelector("a-entity[camera]");
              if (camera) {
                camera.setAttribute("look-controls", "enabled: true; pointerLockEnabled: false; touchEnabled: true; reverseMouseDrag: false; reverseTouchDrag: false;");
                console.log("カメラの向き追跡を再設定しました");
                
                // モデルの回転を定期的に更新
                const rotationInterval = setInterval(() => {
                  updateModelRotation();
                }, 100); // 100msごとに更新
                
                // クリーンアップ用にintervalを保存
                (scene as any).rotationInterval = rotationInterval;
              }
              
              // デバイスモーションイベントを監視
              window.addEventListener('deviceorientation', (event) => {
                console.log("デバイス向き変更 - Alpha:", event.alpha, "Beta:", event.beta, "Gamma:", event.gamma);
                // Beta値（上下の傾き）を特に監視
                if (event.beta !== null) {
                  console.log("上下の傾き (Beta):", event.beta);
                }
              });
              
              window.addEventListener('devicemotion', (event) => {
                if (event.acceleration) {
                  console.log("デバイス動き - X:", event.acceleration.x, "Y:", event.acceleration.y, "Z:", event.acceleration.z);
                }
              });
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

        // フレームレート監視とSFデータ更新
        let frameCount = 0;
        let lastTime = performance.now();
        const frameRateInterval = setInterval(() => {
          const currentTime = performance.now();
          const deltaTime = currentTime - lastTime;
          const currentFrameRate = Math.round((frameCount * 1000) / deltaTime);
          setFrameRate(currentFrameRate);

          // SF的なデータを動的に更新
          setQuantumEnergy(prev => Math.max(85, Math.min(100, prev + (Math.random() - 0.5) * 2)));

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
          
          // 回転更新のintervalを停止
          if ((scene as any).rotationInterval) {
            clearInterval((scene as any).rotationInterval);
          }
          
          // アニメーションループは自動的に停止される
        };
      }
    }
  }, [showAR]);

  // AR画面のレンダリング
  const renderARScene = () => {
    return (
      <div 
        className="ar-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ 
          touchAction: 'none', // ブラウザのデフォルトタッチ動作を無効化
          userSelect: 'none'   // テキスト選択を無効化
        }}
      >

        {/* 量子ARシステム情報 */}
        <div className="debug-info" style={{ 
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          border: '2px solid #00ffff',
          borderRadius: '12px',
          padding: '15px',
          fontFamily: 'monospace',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ color: '#00ffff', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
            QUANTUM AR v2054
        </div>

          <div style={{ color: '#00ff88', marginBottom: '6px' }}>
            ⚡ Status: {arStatus === "AR.js 初期化完了" ? "ACTIVE" : "INIT"}
          </div>
          <div style={{ color: '#ff6b35', marginBottom: '6px' }}>
            🧠 Hologram: {detectedMarkers === "3Dオブジェクト表示中" ? "ON" : "OFF"}
          </div>
          <div style={{ color: '#9c27b0', marginBottom: '6px' }}>
            📡 Camera: {cameraStatus === "カメラ接続済み" ? "OK" : "SCAN"}
          </div>
          <div style={{ color: '#ff5722', marginBottom: '6px' }}>
            ⚡ FPS: {frameRate}
            </div>
          
          <div style={{ color: '#ff1744', marginBottom: '10px' }}>
            ⚛️ Energy: {quantumEnergy.toFixed(0)}%
          </div>
          
          <div style={{ color: "#00ff88", fontWeight: "bold", textAlign: 'center', fontSize: '12px' }}>
            🌌 Move device • 👆 Swipe to control
          </div>
        </div>

        {/* A-Frame AR Scene - Simple Overlay */}
          {/* @ts-expect-error A-Frame type definitions */}
        <a-scene
          embedded
          arjs="sourceType: webcam; debugUIEnabled: true; trackingMethod: best; detectionMode: mono; matrixCodeType: 3x3;"
          vr-mode-ui="enabled: false" 
          renderer="logarithmicDepthBuffer: true; colorManagement: true;"
        >
          {/* Camera with look controls enabled */}
           {/* @ts-expect-error A-Frame type definitions */}
          <a-entity 
            camera 
            look-controls="enabled: true; pointerLockEnabled: false; touchEnabled: true; reverseMouseDrag: false; reverseTouchDrag: false;"
            wasd-controls="enabled: false"
            position="0 0 0"
          >
            {/* @ts-expect-error A-Frame type definitions */}
          </a-entity>

          {/* Light */}
             {/* @ts-expect-error A-Frame type definitions */}
          <a-light type="ambient" color="#404040" intensity="0.6"></a-light>
             {/* @ts-expect-error A-Frame type definitions */}
          <a-light type="directional" position="0 1 2" color="#ffffff" intensity="0.8"></a-light>

          {/* 3D Model overlaid on camera */}
          {/* @ts-expect-error A-Frame type definitions */}
          <a-gltf-model 
            src="/models/scene.glb" 
            scale="0.125 -0.125 0.125" 
            position={`${modelPosition.x} ${modelPosition.y} ${modelPosition.z}`}
            rotation={`${modelRotation.x} ${modelRotation.y} ${modelRotation.z}`}
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
        
        {/* PWAインストールプロンプト */}
        {showInstallPrompt && (
          <div className="mt-4 p-4 bg-blue-100 border border-blue-400 rounded-lg">
            <p className="text-blue-800 mb-2">📱 アプリをホーム画面に追加できます</p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                インストール
              </button>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                後で
              </button>
            </div>
          </div>
        )}

        {/* PWA更新通知 */}
        {needRefresh && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
            <p className="text-yellow-800 mb-2">新しいバージョンが利用可能です</p>
            <div className="flex gap-2">
              <button
                onClick={() => updateServiceWorker(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm"
              >
                更新
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                後で
              </button>
            </div>
          </div>
        )}
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
