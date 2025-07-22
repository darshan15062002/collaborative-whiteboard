import { Excalidraw } from "@excalidraw/excalidraw";

import "@excalidraw/excalidraw/index.css";
import "./App.css"
function App() {
  const handleChange = async (excalidrawElements, appState, files) => {

    console.log("Excalidraw Elements:", excalidrawElements);
    console.log("App State:", appState);
    console.log("Files:", files);

  }

  return (
    <>

      <div style={{ height: "100vh" }} onChange={handleChange} className="custom-styles">
        <Excalidraw theme="dark" />
      </div>
    </>
  )
}

export default App
