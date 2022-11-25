import { Link } from "react-router-dom";
import "../App.css";

function App() {
  return (
    <div className="auth-container">
      <div className="content-wrapper">
        <div className="header">Create an account</div>
        <div className="info-container">
          <div className="input-header">Business name</div>
          <input />
        </div>
        <div className="info-container">
          <div className="input-header">Company address</div>
          <input />
        </div>
        <div className="info-container">
          <div className="input-header">Agent address</div>
          <input />
        </div>
        <div className="info-container">
          <div className="input-header">Email</div>
          <input />
        </div>
        <div className="info-container">
          <div className="input-header">Password</div>
          <input />
        </div>
        <div className="button">Sign up</div>
      </div>
    </div>
  );
}

export default App;
