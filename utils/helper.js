import express from "express";
import User from "../models/user.js";

export const checkIfEmailExists = async (email) => {
  const user = await User.findOne({ email });
  return !!user;
};
