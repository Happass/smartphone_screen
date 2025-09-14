import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const handleARClick = () => {
    window.open('/ar.html', '_blank')
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>AR Marker Recognition App</h1>
      <div className="card">
        <button onClick={handleARClick} style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '15px 30px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}>
          🎯 AR体験を開始
        </button>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          「AR体験を開始」ボタンをクリックして、マーカー認識機能をお試しください
        </p>
      </div>
      <div className="instructions">
        <h3>使用方法:</h3>
        <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
          <li>ARページが開いたら、カメラの許可を求められた場合は「許可」をクリック</li>
          <li>複数のカメラがある場合は「📷 カメラ選択」ボタンでカメラを切り替えできます</li>
          <li>Patternマーカーを印刷または画面に表示してください：</li>
          <ul>
            <li><strong>Pattern マーカー:</strong> 3Dモデルが回転アニメーションで表示されます</li>
          </ul>
          <li>マーカーをカメラに向けると、3Dオブジェクトが表示されます</li>
        </ul>
      </div>
      <p className="read-the-docs">
        <a href="./markers/pattern.patt" target="_blank">Patternマーカーをダウンロード</a>
      </p>
    </>
  )
}

export default App
