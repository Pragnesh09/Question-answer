import { client } from "../database/database.js";

// Create a new user
const createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    await client.query(
      `insert into users(username,email,password) values($1,$2,$3) RETURNING * `,
      [username, email, password]
    );

    res.status(200).json({ message: "User Insert Succesfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export { createUser };
