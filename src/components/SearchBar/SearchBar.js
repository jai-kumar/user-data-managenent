import React, { useRef } from "react";
import "./SearchBar.css";
import SearchIcon from "@material-ui/icons/Search";
import { useStateValue } from "./../../StateProvider";

function SearchBar() {
  const searchBoxRef = useRef("");
  const [{ users }, dispatch] = useStateValue();

  const handleSearch = function (e) {
    if (e.target.value === "") {
      dispatch({
        type: "UPDATE_SEARCHED_USER",
        users: [],
      });
      return;
    }
    let matchedUsers = users.filter((user) => {
      return user.name.toLowerCase().includes(e.target.value.toLowerCase());
    });

    dispatch({
      type: "UPDATE_SEARCHED_USER",
      users: matchedUsers,
    });
  };

  const handleSearchLeave = (e) => {
    dispatch({
      type: "UPDATE_SEARCHED_USER",
      users: [],
    });

    e.target.value = "";
  };

  return (
    <div className="searchBar">
      <input
        className="searchBar__searchInput"
        type="text"
        ref={searchBoxRef}
        placeholder="Search your Friend's name"
        onChange={handleSearch}
        onBlur={handleSearchLeave}
      />
      <SearchIcon className="searchBar__searchIcon" />
    </div>
  );
}

export default SearchBar;
