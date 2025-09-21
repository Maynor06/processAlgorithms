import { BrowserRouter, Route, Routes } from "react-router"
import { ProcesoProvider } from "./Context/ProcessContext"
import Home from "./Components/Home"

const RouterComponent = () => {
    return(
        <ProcesoProvider>
            <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home/>} />
            </Routes>
            </BrowserRouter>
        </ProcesoProvider>
    )
}

export default RouterComponent 