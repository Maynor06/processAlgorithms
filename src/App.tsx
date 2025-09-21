import { useState } from 'react'
import './App.css'
import RouterComponent from './Router'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <RouterComponent/>
    </>
  )
}

export default App
