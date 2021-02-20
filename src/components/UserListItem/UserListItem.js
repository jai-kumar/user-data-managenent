import React, { useRef } from "react";
import FavoriteIcon from "@material-ui/icons/Favorite";
import FavoriteBorderIcon from "@material-ui/icons/FavoriteBorder";
import DeleteIcon from "@material-ui/icons/Delete";
import { useStateValue } from "../../StateProvider";
import "./UserListItem.css";

function UserListItem({ user }) {
  const removeBtnRef = useRef("");
  const favoriteBtnRef = useRef("");
  const [{}, dispatch] = useStateValue();

  const handleRemoveUser = (e) => {
    let response = window.confirm(
      `Are you sure you want to unfriend ${removeBtnRef.current.dataset.username}`
    );

    if (!response) {
      return;
    }

    let idToBeRemoved = removeBtnRef.current.dataset.userid;

    dispatch({
      type: "REMOVE_USER",
      id: idToBeRemoved,
    });
  };

  const toggleFavoriteUser = () => {
    dispatch({
      type: "UPDATE_USER",
      id: favoriteBtnRef.current.dataset.userid,
    });
  };

  return (
    <div className="userListItem">
      <span className="userListItem__name">{user.name}</span>
      <span className="userListItem__buttons">
        <button
          ref={favoriteBtnRef}
          className="btn fav"
          data-userid={user.id}
          onClick={toggleFavoriteUser}
        >
          {user.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </button>
        <button
          ref={removeBtnRef}
          className="btn remove"
          data-userid={user.id}
          data-username={user.name}
          onClick={handleRemoveUser}
        >
          <DeleteIcon />
        </button>
      </span>
    </div>
  );
}

export default UserListItem;
