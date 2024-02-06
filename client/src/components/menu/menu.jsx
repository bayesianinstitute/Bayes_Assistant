import axios from "axios";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Bar,
  LogOut,
  Message,
  Plus,
  Settings,
  Tab,
  Tick,
  Trash,
  Xicon,
} from "../../assets/";
import instance from "../../config/instance";
import { activePage, addHistory } from "../../redux/history";
import { emptyUser } from "../../redux/user";
import "./style.scss";

const Menu = ({ changeColorMode }) => {
  let path = window.location.pathname;

  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const settingRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // const { history } = useSelector((state) => state)
  const { history, user } = useSelector((state) => state);
  const [confirm, setConfim] = useState(false);
  const isUserExpired = user.expireAt && new Date(user.expireAt) < new Date();
  // console.log("User:", user);
  // console.log("Is User Expired:", isUserExpired);

  const logOut = async () => {
    if (window.confirm("Do you want log out")) {
      let res = null;
      try {
        res = await instance.get("/api/user/logout");
      } catch (err) {
        alert(err);
      } finally {
        if (res?.data?.status === 200) {
          alert("Done");
          dispatch(emptyUser());
          navigate("/login");
        }
      }
    }
  };

  const clearHistory = async (del) => {
    if (del) {
      let res = null;

      try {
        res = instance.delete("/api/chat/all");
      } catch (err) {
        alert("Error");
        console.log(err);
      } finally {
        if (res) {
          navigate("/chat");
          dispatch(addHistory([]));
        }

        setConfim(false);
      }
    } else {
      setConfim(true);
    }
  };

  const showMenuMd = () => {
    menuRef.current.classList.add("showMd");
    document.body.style.overflowY = "hidden";
  };

  //Menu

  useEffect(() => {
    window.addEventListener("click", (e) => {
      if (
        !menuRef?.current?.contains(e.target) &&
        !btnRef?.current?.contains(e.target)
      ) {
        menuRef?.current?.classList?.remove("showMd");
        document.body.style.overflowY = "auto";
      }
    });

    window.addEventListener("resize", () => {
      if (!window.matchMedia("(max-width:767px)").matches) {
        document.body.style.overflowY = "auto";
      } else {
        if (menuRef?.current?.classList?.contains("showMd")) {
          document.body.style.overflowY = "hidden";
        } else {
          document.body.style.overflowY = "auto";
        }
      }
    });
  });

  // History Get
  useEffect(() => {
    const getHistory = async () => {
      let res = null;
      try {
        res = await instance.get("/api/chat/history");
      } catch (err) {
        console.log(err);
      } finally {
        if (res?.data) {
          dispatch(addHistory(res?.data?.data));
        }
      }
    };

    getHistory();
  }, [path]);

  // History active
  useEffect(() => {
    setConfim(false);
    let chatId = path.replace("/chat/", "");
    chatId = chatId.replace("/", "");
    dispatch(activePage(chatId));
  }, [path, history]);

  return (
    <Fragment>
      <Modal changeColorMode={changeColorMode} settingRef={settingRef} />

      <header>
        <div className="start">
          <button onClick={showMenuMd} ref={btnRef}>
            <Bar />
          </button>
        </div>

        <div className="title">
          {path.length > 6 ? history[0]?.prompt : "New chat"}
        </div>

        <div className="end">
          <button
            onClick={() => {
              if (path.includes("/chat")) {
                navigate("/");
              } else {
                navigate("/chat");
              }
            }}
          >
            <Plus />
          </button>
        </div>
      </header>

      <div className="menu" ref={menuRef}>
        <div>
          <button
            type="button"
            aria-label="new"
            onClick={() => {
              if (path.includes("/chat")) {
                navigate("/");
              } else {
                navigate("/chat");
              }
            }}
          >
            <Plus />
            New chat
          </button>
        </div>

        <div className="history">
          {history?.map((obj, key) => {
            if (obj?.active) {
              return (
                <button
                  key={key}
                  className="active"
                  onClick={() => {
                    navigate(`/chat/${obj?.chatId}`);
                  }}
                >
                  <Message />
                  {obj?.prompt}
                </button>
              );
            } else {
              return (
                <button
                  key={key}
                  onClick={() => {
                    navigate(`/chat/${obj?.chatId}`);
                  }}
                >
                  <Message />
                  {obj?.prompt}
                </button>
              );
            }
          })}
        </div>

        <div className="actions">
          {history?.length > 0 && (
            <>
              {confirm ? (
                <button onClick={() => clearHistory(true)}>
                  <Tick />
                  Confirm clear conversations
                </button>
              ) : (
                <button onClick={() => clearHistory(false)}>
                  <Trash />
                  Clear conversations
                </button>
              )}
            </>
          )}
          {/*<button><Avatar />Upgrade to Plus <span>New</span></button>*/}
          <button
            onClick={() => {
              if (settingRef?.current) {
                settingRef.current.classList.add("clicked");
                settingRef.current.style.display = "flex";
              }
            }}
          >
            <Settings />
            Settings
          </button>

          {/*
          <button onClick={() => {
            window.open('https://help.openai.com/en/collections/3742473-chatgpt', '_blank')
          }}><Tab />Get help</button>
          */}
          <button onClick={logOut}>
            <LogOut />
            Log out
          </button>
        </div>
      </div>

      <div className="exitMenu">
        <button>
          <Xicon />
        </button>
      </div>
    </Fragment>
  );
};

export default Menu;

const Modal = ({ changeColorMode, settingRef }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [modalState, setModalState] = useState({
    selectedModel: "",
    invitationCode: "",
    showinvitationCode: "",
    isUpdateValid: false,
    expirationDate: null,
    showUpdateButton: false,
    rerender: false, 
  });

  useEffect(() => {
    const fetchInvitationStatus = async () => {
      try {
        const response = await axios.get("/api/chat/userDetails");

        const { status, expireAt, inviteCode } = response.data;

        if (status) {
          setModalState((prevState) => ({
            ...prevState,
            expirationDate: expireAt,
            isUpdateValid: true,
            showinvitationCode: inviteCode,
          }));
        } else {
          setModalState((prevState) => ({
            ...prevState,
            expirationDate: expireAt,
            showUpdateButton: true,
            showinvitationCode: inviteCode,
          }));
        }
      } catch (error) {
        console.error("Error fetching invitation status:", error.message);
      }
    };

    fetchInvitationStatus();
  }, [modalState.rerender]); // Trigger effect when rerender state changes

  const handleInvitationCodeChange = (event) => {
    setModalState((prevState) => ({
      ...prevState,
      invitationCode: event.target.value,
    }));
  };

  const handleUpdateInvitationCode = async () => {
    const confirmUpdate = window.confirm(
      "Do you want to update the invitation code?"
    );

    if (confirmUpdate) {
      try {
        const response = await axios.put("/api/chat/update-invitation-code", {
          code: modalState.invitationCode,
        });

        console.log("Invitation code updated successfully:", response.data);

        if (response.data?.expireAt) {
          setModalState((prevState) => ({
            ...prevState,
            expirationDate: response.data.expireAt,
            isUpdateValid: true,
            showUpdateButton: false,
          }));
        } else {
          setModalState((prevState) => ({
            ...prevState,
            expirationDate: response.data.expireAt,
          }));
        }

        setModalState((prevState) => ({
          ...prevState,
          rerender: !prevState.rerender, // Trigger rerender after update
        }));
      } catch (error) {
        console.error("Error updating invitation code:", error.message);
        alert("Invalid invitation code");
        setModalState((prevState) => ({
          ...prevState,
          invitationCode: "", 
        }));
      }
    } else {
      console.log("Invitation code update canceled.");
    }
  };

  useEffect(() => {
    const getModelType = async () => {
      try {
        const response = await axios.get("/api/chat/modelType");
        setModalState((prevState) => ({
          ...prevState,
          selectedModel: response.data.data.modelType,
        }));
      } catch (error) {
        console.error("Error while fetching model type:", error.message);
        setModalState((prevState) => ({
          ...prevState,
          selectedModel: "gpt-4-1106-preview",
        }));
      }
    };

    getModelType();
  }, []);

  const handleModelChange = async (event) => {
    const newModelType = event.target.value;
    setModalState((prevState) => ({
      ...prevState,
      selectedModel: newModelType,
    }));
    await setModelTypeAPI(newModelType);
    console.log("Model changed", newModelType);
  };

  const setModelTypeAPI = async (newModelType) => {
    // Make an API call to set the new model type using Axios
    try {
      const response = await axios.put("/api/chat/modelType", {
        modelType: newModelType,
      });

      console.log("Model type set successfully:", response.data);
    } catch (error) {
      console.error("Error while setting model type:", error.message);
    }
  };

  const deleteAccount = async () => {
    if (window.confirm("Do you want delete your account")) {
      let res = null;
      try {
        res = await instance.delete("/api/user/account");
      } catch (err) {
        console.log(err);
        if (err?.response?.data?.status === 405) {
          alert("Not Logged");
          dispatch(emptyUser());
          navigate("/login");
        } else {
          alert(err);
        }
      } finally {
        alert("Success");
        dispatch(emptyUser());
        navigate("/login");
      }
    }
  };

  return (
    <div
      className="settingsModal"
      ref={settingRef}
      onClick={(e) => {
        let inner = settingRef.current.childNodes;
        if (!inner?.[0]?.contains(e.target)) {
          settingRef.current.style.display = "none";
        }
      }}
    >
      <div className="inner">
        <div className="content top">
          <h3>Settings</h3>
          <button
            onClick={() => {
              settingRef.current.style.display = "none";
            }}
          >
            <Xicon />
          </button>
        </div>
        <div className="content ceneter">
          <p>Dark mode</p>
          <button
            onClick={() => {
              let mode = localStorage.getItem("darkMode");
              if (mode) {
                changeColorMode(false);
              } else {
                changeColorMode(true);
              }
            }}
            role="switch"
            type="button"
          >
            <div></div>
          </button>

          {/* Dropdown menu for selecting the model */}

          {/* <p>Select Model:</p>
          <select value={modalState.selectedModel} onChange={handleModelChange}>
            <option value="gpt-3.5-turbo">GPT-3.5-Turbo</option>
            <option value="gpt-4-1106-preview">GPT-4-Preview</option>
          </select> */}
        </div>

        <div className="bottum">
          {/* <button>Export data</button> */}
          <button className="end" onClick={deleteAccount}>
            Delete account
          </button>
        </div>
        <div className="InviationCode">
          {/* Invitation code input */}
          {modalState.showUpdateButton && !modalState.isUpdateValid && (
            <div className="bottom">
              <p>Invitation Code:</p>
              <input
                type="text"
                placeholder="Enter Invitation Code"
                value={modalState.invitationCode}
                onChange={handleInvitationCodeChange}
                disabled={modalState.isUpdateValid}
              />
              <div>
                <button
                  onClick={handleUpdateInvitationCode}
                  disabled={modalState.isUpdateValid}
                >
                  Update Code
                </button>
              </div>
              <div className="bottom">
                <p>
                  Code Expire at : <b> {modalState.expirationDate}</b>
                </p>
                <p>
                  Your last Code : <b>{modalState.showinvitationCode}</b>{" "}
                </p>
              </div>
            </div>
          )}

          {/* Display expiration date if update is valid */}
          {modalState.isUpdateValid && (
            <div className="bottom">
              <p>
                Code Valid Until:<b> {modalState.expirationDate} </b>
              </p>
              <p>
                Your Current Code :<b> {modalState.showinvitationCode}</b>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
