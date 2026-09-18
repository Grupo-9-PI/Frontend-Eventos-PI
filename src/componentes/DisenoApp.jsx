import { Outlet } from "react-router-dom";
import BarraLateral from "./BarraLateral";
import "./DisenoApp.css";

export default function DisenoApp() {
  return (
    <div className="diseno-app">
      <BarraLateral />
      <main className="diseno-app-contenido">
        <Outlet />
      </main>
    </div>
  );
}
