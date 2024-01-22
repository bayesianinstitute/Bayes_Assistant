import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { RobotIcon } from "../assets";
import { LoginComponent } from "../components";
import { setLoading } from "../redux/loading";
import "./style.scss";

const Login = () => {
  const location = useLocation();

  const [auth, setAuth] = useState(false);

  const { user } = useSelector((state) => state);

  const dispatch = useDispatch();

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      if (location?.pathname === "/login/auth") {
        setAuth(true);
        setTimeout(() => {
          dispatch(setLoading(false));
        }, 1000);
      } else {
        setAuth(false);
        setTimeout(() => {
          dispatch(setLoading(false));
        }, 1000);
      }
    }
  }, [location]);

  const handleLogin = () => {
    // Add your login logic here, after verifying the reCAPTCHA response
  };

  return (
    <div className="Auth">
      <div className="inner">
        {auth ? (
          <LoginComponent />
        ) : (
          <div className="suggection">
            <div>
              <RobotIcon />
            </div>

            <div>
              <p>Welcome to Bayes E-commerce Chat</p>
              <p>Log in with your  account to continue</p>
            </div>

             
            <div className="btns">
              <button
                onClick={() => {
                  navigate("/login/auth");
                }}
              >
                Log in
              </button>
              <button
                onClick={() => {
                  navigate("/signup");
                }}
              >
                Sign up
              </button>
            </div>

           
          </div>
        )}

        <div className="bottum">
          <div className="start">
            <p>Terms of use</p>
          </div>
          <div className="end">
            <p>Privacy Policy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
