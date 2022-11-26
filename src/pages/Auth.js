import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../App.css";

function App() {
  const navigate = useNavigate();

  const [authAction, setAuthAction] = useState("signup");
  const [business, setBusiness] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const buttonRef = useRef(null);

  const itemsFilled = () => {
    return (
      business.length &&
      companyAddress.length &&
      agentAddress.length &&
      email.length &&
      password.length
    );
  };

  const signUp = async () => {
    try {
      buttonRef.current.classList.remove("active");

      const response = await axios.post(
        "http://localhost:4000/api/v1/auth/signup",
        {
          business,
          companyAddress,
          agentAddress,
          email,
          password,
        }
      );

      console.log(response);

      if (response.status === 200) {
        navigate("/business");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const login = async () => {
    try {
      buttonRef.current.classList.remove("active");

      const response = await axios.post(
        "http://localhost:4000/api/v1/auth/login",
        {
          email,
          password,
        }
      );

      console.log(response);

      if (response.data.token && response.data.token.length) {
        navigate("/business");
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (itemsFilled()) {
      buttonRef.current.classList.add("active");
    } else if (email.length && password.length && authAction === "login") {
      buttonRef.current.classList.add("active");
    } else {
      buttonRef.current.classList.remove("active");
    }
  }, [business, companyAddress, agentAddress, email, password, authAction]);

  return (
    <div className="auth-container">
      <div className="content-wrapper">
        {authAction === "signup" ? (
          <>
            <div className="header">Create an account</div>
            <div className="info-container">
              <div className="input-header">Business name</div>
              <input
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
              />
            </div>
            <div className="info-container">
              <div className="input-header">Company address</div>
              <input
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
              />
            </div>
            <div className="info-container">
              <div className="input-header">Agent address</div>
              <input
                value={agentAddress}
                onChange={(e) => setAgentAddress(e.target.value)}
              />
            </div>
            <div className="info-container">
              <div className="input-header">Email</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="info-container">
              <div className="input-header">Password</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
            </div>
            <div className="button" ref={buttonRef} onClick={signUp}>
              Sign up
            </div>
            <div className="other-text" onClick={() => setAuthAction("login")}>
              Log in instead
            </div>
          </>
        ) : (
          <>
            <div className="header">Log back in</div>
            <div className="info-container">
              <div className="input-header">Email</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="info-container">
              <div className="input-header">Password</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
            </div>
            <div className="button" ref={buttonRef} onClick={login}>
              Login
            </div>
            <div className="other-text" onClick={() => setAuthAction("signup")}>
              Sign up instead
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
