import React, { useLayoutEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { setLoading } from "./redux/loading";
import instance from "./config/instance";
import { emptyUser, insertUser } from "./redux/user";
import { emptyAllRes } from "./redux/messages";

const ProtectedRoute = ({ offline, authed }) => {
  const [component, setComponent] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useLayoutEffect(() => {
    dispatch(setLoading(true));
    const getResponse = async () => {
      let res = null;

      try {
        res = await instance.get("/api/user/checkLogged");
        if (res?.data?.data) {
          dispatch(insertUser(res?.data?.data));
        }
      } catch (err) {


        console.log("error in proteted")
        console.log(err);


        if (err?.response?.data?.status === 405) {
          dispatch(emptyUser());
          dispatch(emptyAllRes());
          if (authed) {
            navigate("/login");
          } else {
            setComponent(<Outlet />);
          }
        } else if (err?.response?.data?.message?.status === 410){

          console.log("Your invation code is experied")
          alert("Your invation code is experied")
          navigate("/update_invitation_code"); 
          
        }
        else if (err?.code !== "ERR_NETWORK") {
          navigate("/something-went-wrong");
        }
      } finally {
        if (res?.data?.status === 208) {
          if (!authed) {
            navigate("/");
          } else {
            setComponent(<Outlet />);
          }
        }
      }
    };

    if (!offline) {
      getResponse();
    }
  }, []);

  return component;
};

export default ProtectedRoute;
