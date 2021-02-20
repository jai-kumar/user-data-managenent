import React, { useEffect } from "react";
import "./PageNumbers.css";
import { useStateValue } from "../../StateProvider";

function PageNumbers({ pageNumbers }) {
  const [{ users, currentPage, usersPerPage }, dispatch] = useStateValue();

  const showUsersForPage = (n) => {
    const indexOfLastUser = n * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);

    dispatch({
      type: "UPDATE_CURRENT_PAGE",
      pageNumber: n,
      users: currentUsers,
    });
  };

  const handleUpdateCurrentPage = function (event) {
    showUsersForPage(parseInt(event.target.id));
  };

  useEffect(() => {
    showUsersForPage(currentPage);
  }, []);

  return (
    <div className="pageNumbers__nums">
      {pageNumbers.map((number) => {
        return (
          <li
            key={number}
            id={number}
            onClick={handleUpdateCurrentPage}
            style={{
              backgroundColor: currentPage === number ? "lightgreen" : "",
            }}
          >
            {number}
          </li>
        );
      })}
    </div>
  );
}

export default PageNumbers;
