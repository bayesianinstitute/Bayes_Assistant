import { db } from "../db/connection.js";
import collections from "../db/collections.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { sendErrorEmail } from "../mail/send.js";

export default {
  signup: ({ email, pass, inviteCode, manual, pending }) => {
    return new Promise(async (resolve, reject) => {
      let done = null;

      let userId = new ObjectId().toHexString();

      try {
        let check = await db.collection(collections.USER).findOne({
          email: email,
        });
        const invitationDocument = await db
          .collection(collections.INVITATION)
          .findOne({
            codes: inviteCode,
          });

        if (!invitationDocument) {
          console.log(`Code ${inviteCode} not found.`);
          reject({ message: `Code ${inviteCode} not found.` });
          return;
        }
        if (!check) {
          pass = await bcrypt.hash(pass, 10);

          await db
            .collection(collections.TEMP)
            .createIndex({ email: 1 }, { unique: true });
          await db
            .collection(collections.TEMP)
            .createIndex({ expireAt: 1 }, { expireAfterSeconds: 3600 });
          done = await db.collection(collections.TEMP).insertOne({
            _id: new ObjectId(userId),
            userId: `${userId}_register`,
            email: `${email}_register`,
            inviteCode: inviteCode,
            register: true,
            pass: pass,
            manual: manual,
            pending: pending,
            expireAt: new Date(),
          });
        }
      } catch (err) {
        if (err?.code === 11000) {
          done = await db
            .collection(collections.TEMP)
            .findOneAndUpdate(
              {
                email: `${email}_register`,
                register: true,
              },
              {
                $set: {
                  pass: pass,
                  manual: manual,
                },
              }
            )
            .catch((err) => {
              reject(err);
            });
        } else if (err?.code === 85) {
          done = await db
            .collection(collections.TEMP)
            .insertOne({
              _id: new ObjectId(userId),
              userId: `${userId}_register`,
              email: `${email}_register`,
              pass: pass,
              manual: manual,
              pending: pending,
              expireAt: new Date(),
            })
            .catch(async (err) => {
              if (err?.code === 11000) {
                done = await db
                  .collection(collections.TEMP)
                  .findOneAndUpdate(
                    {
                      email: `${email}_register`,
                      register: true,
                    },
                    {
                      $set: {
                        pass: pass,
                        manual: manual,
                      },
                    }
                  )
                  .catch((err) => {
                    reject(err);
                  });
              } else {
                reject(err);
              }
            });
        } else {
          reject(err);
        }
      } finally {
        if (done?.value) {
          resolve({ _id: done?.value?._id.toString(), manual });
        } else if (done?.insertedId) {
          resolve({ _id: done?.insertedId?.toString(), manual });
        } else {
          reject({ exists: true, text: "Email already used" });
        }
      }
    });
  },
  checkPending: (_id) => {
    return new Promise(async (resolve, reject) => {
      let data = await db
        .collection(collections.USER)
        .findOne({
          _id: new ObjectId(_id),
        })
        .catch((err) => {
          reject(err);
        });

      if (data) {
        reject({ status: 422, text: "Already registered" });
      } else {
        let check = null;

        try {
          check = await db.collection(collections.TEMP).findOne({
            _id: new ObjectId(_id),
          });
        } catch (err) {
          reject(err);
        } finally {
          if (check) {
            delete check.pass;
            resolve(check);
          } else {
            reject({ status: 404, text: "Not Found" });
          }
        }
      }
    });
  },
  finishSignup: ({ fName, lName, _id }) => {
    return new Promise(async (resolve, reject) => {
      let data = await db
        .collection(collections.TEMP)
        .findOne({
          _id: new ObjectId(_id),
        })
        .catch((err) => {
          reject(err);
        });

      if (data) {
        console.log("data: ", data);
        let { pass, email, inviteCode } = data;
        email = email.replace("_register", "");

        let res = null;
        try {
          // Calculate expiration date (30 days from now)
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 30);
          console.log("expirationDate: ", expirationDate);
          const invitationDocument = await db
            .collection(collections.INVITATION)
            .findOne({ codes: inviteCode });
          console.log("inviation : ", invitationDocument);
          if (!invitationDocument) {
            reject({ message: `Code ${inviteCode} not found.` });
            return;
          }
          await db
            .collection(collections.USER)
            .createIndex({ email: 1 }, { unique: true });
          console.log("befor ", res);
          res = await db.collection(collections.USER).insertOne({
            _id: new ObjectId(_id),
            email: email,
            fName: fName,
            lName: lName,
            pass: pass,
            inviteCode: inviteCode,
            createAt: new Date(),
            expireAt: expirationDate,
          });

          console.log("res :", res);

          const result = await db
            .collection(collections.INVITATION)
            .updateOne({ codes: inviteCode }, { $pull: { codes: inviteCode } });

          console.log(result);
        } catch (err) {
          if (err?.code === 11000) {
            reject({ status: 422 });
          } else {
            reject(err);
          }
        } finally {
          if (res?.insertedId) {
            await db
              .collection(collections.TEMP)
              .deleteOne({
                _id: new ObjectId(_id),
              })
              .catch((err) => {
                console.log(err);
              });

            resolve(res);
          } else {
            reject({ text: "Something Wrong" });
          }
        }
      } else {
        reject({ text: "Something Wrong" });
      }
    });
  },
  login: ({ email, pass, manual }) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .collection(collections.USER)
        .findOne({ email: email })
        .catch((err) => {
          reject(err);
        });

      if (user) {
        if (manual === "false") {
          delete user.pass;
          resolve(user);
        } else {
          let check;
          try {
            check = await bcrypt.compare(pass, user.pass);
          } catch (err) {
            reject(err);
          } finally {
            if (check) {
              delete user.pass;
              resolve(user);
            } else {
              reject({
                status: 422,
              });
            }
          }
        }
      } else {
        reject({
          status: 422,
        });
      }
    });
  },
  forgotRequest: ({ email }, secret) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .collection(collections.USER)
        .findOne({ email: email })
        .catch((err) => reject(err));

      if (user) {
        let done = null;

        try {
          await db
            .collection(collections.TEMP)
            .createIndex({ userId: 1 }, { unique: true });
          await db
            .collection(collections.TEMP)
            .createIndex({ expireAt: 1 }, { expireAfterSeconds: 3600 });
          done = await db.collection(collections.TEMP).insertOne({
            userId: user._id.toString(),
            email: email,
            secret: secret,
            expireAt: new Date(),
          });
        } catch (err) {
          if (err?.code === 11000) {
            secret = await db
              .collection(collections.TEMP)
              .findOneAndUpdate(
                {
                  email: email,
                },
                {
                  $set: {
                    userId: user._id.toString(),
                  },
                }
              )
              .catch((err) => {
                reject(err);
              });

            if (secret) {
              secret.value.userId = user._id.toString();
              secret = secret.value;
              done = true;
            }
          } else if (err?.code === 85) {
            done = await db
              .collection(collections.TEMP)
              .insertOne({
                userId: user._id.toString(),
                email: email,
                secret: secret,
                expireAt: new Date(),
              })
              .catch(async (err) => {
                if (err?.code === 11000) {
                  secret = await db
                    .collection(collections.TEMP)
                    .findOneAndUpdate(
                      {
                        email: email,
                      },
                      {
                        $set: {
                          userId: user._id.toString(),
                        },
                      }
                    )
                    .catch((err) => {
                      reject(err);
                    });

                  if (secret) {
                    secret.value.userId = user._id.toString();
                    secret = secret.value;
                    done = true;
                  }
                } else {
                  reject(err);
                }
              });
          } else {
            reject(err);
          }
        } finally {
          if (done) {
            if (typeof secret === "object") {
              resolve({ secret: secret?.secret, _id: user?._id });
            } else {
              resolve({ secret, _id: user?._id });
            }
          }
        }
      } else {
        reject({ status: 422 });
      }
    });
  },
  resetPassword: ({ newPass, userId, secret }) => {
    return new Promise(async (resolve, reject) => {
      let checkSecret = db
        .collection(collections.TEMP)
        .findOne({
          userId: userId,
          secret: secret,
        })
        .catch((err) => {
          reject(err);
        });
      let done = null;

      if (checkSecret) {
        try {
          newPass = await bcrypt.hash(newPass, 10);
          done = await db.collection(collections.USER).updateOne(
            {
              _id: new ObjectId(userId),
            },
            {
              $set: {
                pass: newPass,
              },
            }
          );
        } catch (err) {
          reject(err);
        } finally {
          if (done?.modifiedCount > 0) {
            await db
              .collection(collections.TEMP)
              .deleteOne({
                userId: userId,
              })
              .catch((err) => {
                console.log(err);
              });

            resolve(done);
          } else {
            reject({ text: "Something Wrong" });
          }
        }
      } else {
        reject({ status: 404 });
      }
    });
  },
  checkForgot: ({ userId, secret }) => {
    return new Promise(async (resolve, reject) => {
      let check = await db
        .collection(collections.TEMP)
        .findOne({
          userId: userId,
          secret: secret,
        })
        .catch((err) => {
          reject(err);
        });

      let user = await db
        .collection(collections.USER)
        .findOne({
          _id: new ObjectId(userId),
        })
        .catch((err) => {
          reject(err);
        });

      if (check && user) {
        resolve(check);
      } else {
        reject({ status: 404 });
      }
    });
  },
  checkUserFound: ({ _id }) => {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await db
          .collection(collections.USER)
          .findOne({ _id: new ObjectId(_id) });

        if (!user) {
          reject({ notExists: true, text: "Not found" });
          return;
        }

        const currentDate = new Date();
        const expireCodeTime = user.expireAt;
        console.log(expireCodeTime);


        // Check if expiration date has passed
        if (expireCodeTime && currentDate > expireCodeTime) {
          let mess=`Invitation code has expired . please subscribe new code to continue`
          console.log(mess)
          // sendErrorEmail(mess)
          reject({ status: 410,expired: true, text: "Invitation code has expired" });
          return;
        }

        resolve(user);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  },

  deleteUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.USER)
        .deleteOne({
          _id: userId,
        })
        .then(async (res) => {
          if (res?.deletedCount > 0) {
            await db
              .collection(collections.CHAT)
              .deleteOne({
                user: userId.toString(),
              })
              .catch((err) => {
                console.log(err);
              });

            resolve(res);
          } else {
            reject({ text: "DB Getting Something Error" });
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};
