import React, { useRef } from "react";
import "./AddUser.css";
import { useStateValue } from "./../../StateProvider";

function AddUser() {
  const [{ users, isNameError }, dispatch] = useStateValue();

  const currentUser = useRef("");

  const handleAddUser = function (e) {
    e.preventDefault();
    let regex = /^[a-zA-Z ]{2,30}$/;
    if (!regex.test(currentUser.current.value)) {
      dispatch({
        type: "SET_ERROR_IN_NAME",
        isNameError: true,
      });
      return;
    }

    dispatch({
      type: "ADD_USER",
      user: {
        id: users[users.length - 1].id + 1,
        name: currentUser.current.value,
        isFavorite: false,
      },
    });

    dispatch({
      type: "SET_ERROR_IN_NAME",
      isNameError: false,
    });

    currentUser.current.value = "";
  };

  return (
    <div className="addUser">
      <form onSubmit={handleAddUser}>
        <input
          className="addUser_input"
          type="text"
          ref={currentUser}
          placeholder="Enter your Friend's name"
        />
        {isNameError ? (
          <span className="addUser__errorMsg">
            * Invalid Name (No Special character and numbers are allowed)
          </span>
        ) : (
          <span className="addUser__msg">**Hit enter to add</span>
        )}
      </form>
    </div>
  );
}

export default AddUser;
