import React, {
  forwardRef,
  Fragment,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { RobotIcon } from "../../assets";

import { insertNew } from "../../redux/messages";
import "./style.scss";
import ReactMarkdown from "react-markdown";
import ReactDOMServer from "react-dom/server";
const Chat = forwardRef(({ error, status }, ref) => {
  const dispatch = useDispatch();

  const contentRef = useRef(null);

  const containerRef = useRef(); // for scroll down

  const { user, messages } = useSelector((state) => state);
  const { latest, content, all } = messages;

  const renderMarkdown = (content) => {
    return ReactDOMServer.renderToString(
      <ReactMarkdown>{content}</ReactMarkdown>
    );
  };

  const loadResponse = async (
    stateAction,
    response = content,
    chatsId = latest?.id
  ) => {
    clearInterval(window.interval);

    stateAction({ type: "resume", status: true });

    const waitForContentRef = async () => {
      if (contentRef?.current) {
        contentRef.current.classList.add("blink");
        let renderedContent = renderMarkdown(response);
        contentRef.current.innerHTML = `<span style="display: inline-block">${renderedContent}</span>`;
        dispatch(insertNew({ chatsId, content: response, resume: true }));
        stopResponse(stateAction);
      } else {
        // Wait and try again after a short delay
        setTimeout(waitForContentRef, 100); // Adjust the delay as needed
      }
    };

    // Start waiting for contentRef to be defined
    waitForContentRef();
  };

  const stopResponse = (stateAction) => {
    if (contentRef?.current) {
      contentRef.current.classList.remove("blink");
    }
    stateAction({ type: "resume", status: false });
    clearInterval(window.interval);
  };

  useImperativeHandle(ref, () => ({
    stopResponse,
    loadResponse,
    clearResponse: () => {
      if (contentRef?.current) {
        contentRef.current.innerHTML = "";
        contentRef?.current?.classList.add("blink");
      }
    },
  }));

  useEffect(() => {
    containerRef.current.scrollIntoView();
  }, [latest, content, all]);

  return (
    <div className="Chat">
      {all
        ?.filter((obj) => {
          return !obj.id ? true : obj?.id !== latest?.id;
        })
        ?.map((obj, key) => {
          return (
            <Fragment key={key}>
              <div className="qs">
                <div className="acc">{user?.fName?.charAt(0)}</div>
                <div className="txt1">
                  <ReactMarkdown>{obj?.prompt}</ReactMarkdown>
                </div>
              </div>

              <div className="res">
                <div className="icon">
                  <RobotIcon />
                  {/*<GptIcon />*/}
                </div>
                <div className="txt">
                  <span>
                    <ReactMarkdown>{obj?.content}</ReactMarkdown>
                  </span>
                </div>
              </div>
            </Fragment>
          );
        })}

      {latest?.prompt?.length > 0 && (
        <Fragment>
          <div className="qs">
            <div className="acc">{user?.fName?.charAt(0)}</div>
            <div className="txt">
              <ReactMarkdown>{latest?.prompt}</ReactMarkdown>
            </div>
          </div>

          <div className="res">
            <div className="icon">
              <RobotIcon />

              {error && <span>!</span>}
            </div>
            <div className="txt">
              {error ? (
                <div className="error">Something went wrong.</div>
              ) : !status?.resume ? (
                <span ref={contentRef} className="blink" />
              ) : (
                <span
                className="loading-text"
                >
                  Loading....
                </span>
              )}
            </div>
          </div>
        </Fragment>
      )}
      <div ref={containerRef} />
    </div>
  );
});
export default Chat;
