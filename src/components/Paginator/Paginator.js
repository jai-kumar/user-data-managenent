import React from "react";
import { useStateValue } from "../../StateProvider";
import PageNumbers from "./PageNumbers";

function Paginator() {
  const [{ users, usersPerPage }, dispatch] = useStateValue();

  // Logic for displaying page numbers
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(users.length / usersPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <div>
      <ul id="page-numbers">
        <PageNumbers pageNumbers={pageNumbers} />
      </ul>
    </div>
  );
}

export default Paginator;
