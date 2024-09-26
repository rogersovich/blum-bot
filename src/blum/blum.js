import { API } from "../api/api.js";
import { Helper } from "../utils/helper.js";
import colors from "colors";
import axios from "axios";

export class Blum extends API {
  constructor(acc, query, queryObj, proxy) {
    super(proxy);
    this.account = acc;
    this.query = query;
  }

  async logSleep() {
    await Helper.delaySimple(
      3000,
      this.getFullName(),
      `${colors.yellow("💤 Sleep for a second")}`,
      "INFO"
    );
  }

  getFullName() {
    const fullName = Helper.getAccountName(
      this.account.firstName,
      this.account.lastName
    );

    return fullName;
  }

  async login() {
    return new Promise(async (resolve, reject) => {
      await Helper.delaySimple(
        2000,
        this.getFullName(),
        `🔒 Start Login`,
        "INFO"
      );
      await this.fetch(
        "https://user-domain.blum.codes/api/v1/auth/provider/PROVIDER_TELEGRAM_MINI_APP",
        "POST",
        undefined,
        {
          query: this.query,
        }
      )
        .then(async (data) => {
          this.token = data.token.access;
          this.refresh = data.token.refresh;
          await Helper.delaySimple(
            2000,
            this.getFullName(),
            `🎉 Succesfully Login`,
            "INFO"
          );
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async getUser(msg = false) {
    return new Promise(async (resolve, reject) => {
      if (msg) {
        await Helper.delaySimple(
          2000,
          this.getFullName(),
          `✅ Getting User Info`,
          "INFO"
        );
      }
      await this.fetch(
        "https://user-domain.blum.codes/api/v1/user/me",
        "GET",
        this.token
      )
        .then(async (data) => {
          this.user = data;
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  async getBalance(msg = false) {
    return new Promise(async (resolve, reject) => {
      if (msg) {
        await Helper.delaySimple(
          2000,
          this.getFullName(),
          `✅ Getting User Balance`,
          "INFO"
        );
      }

      const url_balance = 'https://game-domain.blum.codes/api/v1/user/balance'
      await this.fetch(
        url_balance,
        "GET",
        this.token
      )
        .then(async (data) => {
          this.balance = data;
          const availableBalance = data?.availableBalance || "-";
          const playPasses = data?.playPasses || "0";
          const farming = data?.farming || null;
          const farm = farming
            ? `${Helper.readTime(farming.startTime)} - ${Helper.readTime(
                farming.endTime
              )} ${
                Helper.isFutureTime(farming.endTime)
                  ? "(Claimable)"
                  : "(Unclaimable)"
              }`
            : "-";
          if (msg) {
            await Helper.delaySimple(
              2000,
              this.getFullName(),
              `🪙 Balance: ${colors.green(availableBalance)}`,
              "INFO"
            );
            await Helper.delaySimple(
              2000,
              this.getFullName(),
              `🎲 Play Pass: ${colors.green(playPasses)}`,
              "INFO"
            );
            await Helper.delaySimple(
              2000,
              this.getFullName(),
              `🌿 Farm: ${colors.green(farm)}`,
              "INFO"
            );
          }

          resolve();
        })
        .catch(async (err) => {
          await Helper.delaySimple(
            1000,
            this.getFullName(),
            `🌿 Error Play: ${colors.red(err)}`,
            "INFO"
          );
          reject(err);
        });
    });
  }

  async claim() {
    return new Promise(async (resolve, reject) => {
      await Helper.delaySimple(
        2000,
        this.getFullName(),
        `🎲 Try To Claim Farming Reward`,
        "INFO"
      );
      await this.fetch(
        "https://game-domain.blum.codes/api/v1/farming/claim",
        "POST",
        this.token
      )
        .then(async (data) => {
          this.balance.availableBalance = data.availableBalance;
          this.balance.playPasses = data.playPasses;
          await Helper.delaySimple(
            2000,
            this.getFullName(),
            `${colors.green(`🪙 Farming Reward Claimed`)}`,
            "INFO"
          );
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async mining() {
    return new Promise(async (resolve, reject) => {
      await Helper.delaySimple(
        2000,
        this.getFullName(),
        `🌿 Try to Start Farm`,
        "INFO"
      );
      await this.fetch(
        "https://game-domain.blum.codes/api/v1/farming/start",
        "POST",
        this.token
      )
        .then(async (data) => {
          this.balance.farming = {
            startTime: 0,
            endTime: 0,
            earningsRate: 0,
            balance: 0,
          };
          this.balance.farming.startTime = data.startTime;
          this.balance.farming.endTime = data.endTime;
          this.balance.farming.earningsRate = data.earningsRate;
          this.balance.farming.balance = data.balance;

          await Helper.delaySimple(
            2000,
            this.getFullName(),
            `🌿 Farming Started`,
            "INFO"
          );
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  async getTasks(msg = false) {
    return new Promise(async (resolve, reject) => {
      if (msg) {
        await Helper.delaySimple(
          2000,
          this.getFullName(),
          `✅ Getting Available Task`,
          "INFO"
        );
      }
      await this.fetch(
        "https://earn-domain.blum.codes/api/v1/tasks",
        "GET",
        this.token
      )
        .then(async (data) => {
          this.tasks = [];
          for (const tasks of data) {
            
            if (tasks.subSections.length > 0) {
              for (const subsection of tasks.subSections) {
                if (subsection.title != "New") {
                  this.tasks.push(...subsection.tasks);
                }
              }
            }else if(tasks.title == 'Weekly'){
              for (const taskGroup of tasks.tasks) {
                if (taskGroup.validationType == "DEFAULT" && taskGroup.type == "GROUP") {
                  this.tasks.push(...taskGroup.subTasks);
                }
              }
            }
          }

          if (msg) {
            const completedTask =
              this.tasks.length != 0
                ? this.tasks.filter((item) => {
                    return item.status === "FINISHED";
                  }).length
                : "-";

            const uncompletableTaskIds = [
              "a90d8b81-0974-47f1-bb00-807463433bde",
              "03e4a46f-7588-4950-8289-f42787e3eca2",
            ];

            const uncompletedTask =
              this.tasks.length > 0
                ? this.tasks.filter(
                    (item) =>
                      item.status !== "FINISHED" &&
                      item.type !== "WALLET_CONNECTION" &&
                      item.type !== "PROGRESS_TARGET" &&
                      item.type !== "INTERNAL" &&
                      !uncompletableTaskIds.includes(item.id)
                  )
                : null;

            const uncompletedTaskLength = uncompletedTask.length;
            await Helper.delaySimple(
              3000,
              this.getFullName(),
              `🃏 Task: ${colors.yellow(completedTask) + " Completed"} | ${
                colors.red(uncompletedTaskLength) + " Uncompleted"
              }`,
              "INFO"
            );
          }

          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async startAndCompleteTask(taskId) {
    return new Promise(async (resolve, reject) => {
      await Helper.delaySimple(
        3000,
        this.getFullName(),
        `🃏 Try To Complete Mission with id ${colors.green(taskId)}`,
        "INFO"
      );
      await this.fetch(
        `https://earn-domain.blum.codes/api/v1/tasks/${taskId}/start`,
        "POST",
        this.token
      )
        .then(async (data) => {
          if (data.status == "STARTED" || data.status == "READY_FOR_CLAIM") {
            await this.completeTask(taskId)
              .then(resolve)
              .catch((err) => reject(err));
          } else {
            resolve();
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async validateAndCompleteTask(taskId, answer) {
    return new Promise(async (resolve, reject) => {
      await Helper.delaySimple(
        3000,
        this.getFullName(),
        `🃏 Try To Validating Mission with id ${colors.green(taskId)}`,
        "INFO"
      );
      const body = { keyword: answer };
      await this.fetch(
        `https://earn-domain.blum.codes/api/v1/tasks/${taskId}/validate`,
        "POST",
        this.token,
        body
      )
        .then(async (data) => {
          if (data.status == "STARTED" || data.status == "READY_FOR_CLAIM") {
            await this.completeTask(taskId)
              .then(resolve)
              .catch((err) => reject(err));
          } else {
            resolve();
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async completeTask(taskId) {
    return new Promise(async (resolve, reject) => {
      await Helper.delaySimple(
        3000,
        this.getFullName(),
        `🃏 Mission Completion for Task ${colors.green(taskId)} Started`,
        "INFO"
      );
      await this.fetch(
        "https://earn-domain.blum.codes/api/v1/tasks/" + taskId + "/claim",
        "POST",
        this.token
      )
        .then(async (data) => {
          if (data.status == "FINISHED") {
            await Helper.delaySimple(
              3000,
              this.getFullName(),
              `🃏 Mission Completion for Task ${colors.cyan(
                taskId
              )} ${colors.yellow(data.title)} ${colors.green(data.status)}`,
              "INFO"
            );
            await this.getTasks();
            resolve();
          } else {
            resolve();
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async play() {
    return new Promise(async (resolve, reject) => {
      await Helper.delaySimple(
        2000,
        this.getFullName(),
        `🎲 Trying to play a game using play pass`,
        "INFO"
      );
      await this.fetch(
        "https://game-domain.blum.codes/api/v1/game/play",
        "POST",
        this.token
      )
        .then(async (data) => {
          await this.getBalance();
          const max = 250;
          const min = 200;
          await Helper.delaySimple(
            2000,
            this.getFullName(),
            `🎲 Got Game ID ${colors.green(data.gameId)}`,
            "INFO"
          );
          await Helper.delaySimple(
            45000,
            this.getFullName(),
            `🎲 Game ID, Playing for ${colors.green('45 Second')}`,
            "INFO"
          );

          await this.claimGame(
            data.gameId,
            Math.floor(Math.random() * (max - min + 1)) + min
          );

          resolve();
        })
        .catch(async(err) => {
          await Helper.delaySimple(
            1000,
            this.getFullName(),
            `🎲 ${colors.red(`Error Play Game: ${err?.message}`)}`,
            "INFO"
          );
          reject(err);
        });
    });
  }

  async claimGame(gameId, score) {
    await Helper.delaySimple(
      2000,
      this.getFullName(),
      `🎲 Claiming game With Score ${colors.green(score)}`,
      "INFO"
    );

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        await this.fetch(
          "https://game-domain.blum.codes/api/v1/game/claim",
          "POST",
          this.token,
          {
            gameId: gameId,
            points: score,
          }
        );
        await Helper.delaySimple(
          8000,
          this.getFullName(),
          `🪙 Game Claimed with Score ${colors.green(
            score
          )}. Sleep for 8 Second`,
          "INFO"
        );
        return; // Resolve the promise
      } catch (err) {
        // console.error(err?.response?.data);
        retryCount += 1;
        if (retryCount > maxRetries) {
          return Promise.reject(err); // Reject if max retries reached
        }
        await Helper.delaySimple(
          3000,
          this.getFullName(),
          `⚠️ Claim game failed, retrying after 3 seconds`,
          "INFO"
        );
      }
    }
  }

  async checkIn() {
    return new Promise(async (resolve, reject) => {
      await Helper.delaySimple(
        2000,
        this.getFullName(),
        `🔃 Try to Check In`,
        "INFO"
      );
      await this.fetch(
        "https://game-domain.blum.codes/api/v1/daily-reward?offset=-420",
        "GET",
        this.token
      )
        .then(async () => {
          await this.fetch(
            "https://game-domain.blum.codes/api/v1/daily-reward?offset=-420",
            "POST",
            this.token
          )
            .then(async () => {
              await Helper.delaySimple(
                2000,
                this.getFullName(),
                `✅ Successfully Check In`,
                "INFO"
              );
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        })
        .catch(async (err) => {
          if (err.message.includes("Not Found")) {
            await Helper.delaySimple(
              2000,
              this.getFullName(),
              `⚠️ User Already Checked In`,
              "INFO"
            );
            resolve();
          } else {
            reject(err);
          }
        });
    });
  }
}
