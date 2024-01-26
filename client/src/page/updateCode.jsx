import React, { useState } from "react";

const UpdateInvitationCode = () => {
  const [newInviteCode, setNewInviteCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Submit new invitation code to the server
    //   const response = await instance.post("/api/user/updateInvitationCode", {
    //     newInviteCode,
    //   });
      // Handle successful 
      alert("Added new invitation code");
      
      console.log("New invitation code submitted:", response.data);
    } catch (error) {
      // Handle error if submission fails
      console.error("Error updating invitation code:", error);
      // Display an error message to the user
      alert("Failed to update invitation code. Please try again later.");
    }
  };

  return (
    <div>
      <h2>Update Invitation Code</h2>
      <form onSubmit={handleSubmit}>
        <label>
          New Invitation Code:
          <input
            type="text"
            value={newInviteCode}
            onChange={(e) => setNewInviteCode(e.target.value)}
          />
        </label>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default UpdateInvitationCode;
