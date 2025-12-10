// src/App.js
import React from "react";
import bankbros from "./assets/bankrollbros.png";
import "./App.css"; // optional — keep if you want global styles

export default function App() {
  return <Maintenance />;
}

function Maintenance() {
  return (
    <div style={root}>
      <div style={card}>
        <img src={bankbros} alt="BankBros" style={logo} />
        <h1 style={title}>Maintenance</h1>

        <p style={subtitle}>
          We're performing maintenance right now. The site is temporarily unavailable.
        </p>

        <div style={infoRow}>
          <div style={infoBlock}>
            <div style={infoLabel}>Status</div>
            <div style={infoValue}>Maintenance</div>
          </div>
          <div style={infoBlock}>
            <div style={infoLabel}>Estimated return</div>
            <div style={infoValue}>Shortly — please try again later</div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <a
            href="https://discord.gg/Web23tM2gB"
            target="_blank"
            rel="noopener noreferrer"
            style={discordButton}
          >
            Contact & Status → Discord
          </a>
        </div>
      </div>

      <footer style={footer}>
        © {new Date().getFullYear()} BankBros — Maintenance
      </footer>
    </div>
  );
}

/* Inline styles included so you don't have to change external CSS */
const root = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#050302",
  color: "white",
  padding: "32px",
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

const card = {
  width: "min(960px, 95vw)",
  textAlign: "center",
  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(6,18,28,0.6))",
  border: "1px solid rgba(255,255,255,0.06)",
  padding: "32px",
  borderRadius: 20,
  boxShadow: "0 20px 80px rgba(0,0,0,0.6)",
};

const logo = {
  height: 72,
  marginBottom: 14,
  objectFit: "contain",
};

const title = {
  fontSize: 32,
  margin: 6,
  color: "#B0D2E3",
  letterSpacing: "-0.02em",
};

const subtitle = {
  color: "#cbd5df",
  marginTop: 6,
  marginBottom: 12,
  fontSize: 15,
};

const infoRow = {
  display: "flex",
  gap: 12,
  justifyContent: "center",
  flexWrap: "wrap",
  marginTop: 12,
};

const infoBlock = {
  minWidth: 180,
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.03)",
  padding: "10px 14px",
  borderRadius: 12,
  textAlign: "left",
};

const infoLabel = {
  fontSize: 11,
  textTransform: "uppercase",
  color: "#9fb3c2",
  letterSpacing: "0.12em",
};

const infoValue = {
  marginTop: 6,
  fontWeight: 700,
  color: "#ffffff",
};

const discordButton = {
  display: "inline-block",
  padding: "10px 16px",
  borderRadius: 999,
  textDecoration: "none",
  background: "linear-gradient(90deg, #B0D2E3, #8FBFD0)",
  color: "#00121a",
  fontWeight: 700,
};

const footer = {
  marginTop: 28,
  color: "#93a6b4",
  fontSize: 13,
  opacity: 0.9,
};
