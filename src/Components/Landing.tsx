import React from "react";
import "../Styles/Landing.css";
import bgHero from "/src/assets/back1.jpg"; // importa la imagen
import { useNavigate } from "react-router";


const Landing = () => {

  const navigate = useNavigate()

  const handleNavigate = () => {
    navigate("/processAlgorithms")
  } 

  return (
    <div
      className="hero"
      style={{
        backgroundImage: `url(${bgHero})`,           // inline
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundColor: "#0f221d"                   // fallback instantáneo
      }}
    >
     {/* overlay degradado */}
      <div className="hero__overlay"></div>

      <header className="hero__nav">
        <span className="hero__brand">SISTEMAS OPERATIVOS</span>
        <nav className="hero__links">
          <a className="hero__link" href="#">Inicio</a>
          <a className="hero__link" href="#">Acerca de</a>
          <a className="hero__link" href="#">GitHub</a>
        </nav>
      </header>

      <main className="hero__center">
        <h1 className="hero__title">Simulador de procesos en CPU</h1>
        <p className="hero__subtitle">
          Programa que imita la ejecución de procesos en la CPU, permitiendo
          observar y entender cómo cargan y ejecutan las instrucciones.
        </p>
        <button className="hero__cta" onClick={handleNavigate}>EMPEZAR</button>
      </main>
    </div>
  );
};

export default Landing;