import { BrowserRouter, Route, Routes } from "react-router"
import { ProcesoProvider } from "./Context/ProcessContext"
import Landing from "./Components/Landing"
import Home from "./Components/Home"

const RouterComponent = () => {
    return(
        <ProcesoProvider>
            <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing/>} />
                <Route path="/processAlgorithms" element={<Home/>} />
            </Routes>
            </BrowserRouter>
        </ProcesoProvider>
    )
}

export default RouterComponent 