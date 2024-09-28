import { Blum } from "./src/blum/blum.js";
import { TASKANSWER } from "./src/blum/taskanswer.js";
import { proxyList } from "./src/config/proxy_list.js";
import { Telegram } from "./src/core/telegram.js";
import { Helper } from "./src/utils/helper.js";
import logger from "./src/utils/logger.js";
import colors from "colors"

// Access command-line arguments
const args = process.argv.slice(2); // Skip the first two arguments (node and script path)

// Define a variable to handle play mode
let playMode = false;

// Check if '--play' argument is passed
if (args.includes('--play')) {
    playMode = true;
    logger.info("Play mode activated");
} else {
    logger.info("Normal mode");
}

const MIN_PLAY = 15
const STOP_PLAY = 5

function getFullName(account) {
  const fullName = Helper.getAccountName(
    account.firstName,
    account.lastName
  );

  return fullName;
}

async function runGame(acc, query, queryObj, proxy) {
  logger.clear();
  try {
    const blum = new Blum(acc, query, queryObj, proxy);

    const isMaintained = false

    await blum.login();
    await blum.getUser(true);
    await blum.getBalance(true);
    await blum.getTasks(true);
    await blum.checkIn();

    //* Farming and Claim
    if (blum.balance.farming) {
      if (Helper.isFutureTime(blum.balance.farming.endTime)) {
        await blum.claim();
      }
    }
    await blum.mining();

    //* Task
    if(!isMaintained){
      await doingTasks(blum);
  
      await Helper.delaySimple(
        3000,
        getFullName(blum.account),
        `🔃 Re-getting tasks for verification`,
        "INFO"
      );
  
      await blum.getTasks();
  
      const verifyTasks = blum.tasks.filter((item) => item.status === "READY_FOR_VERIFY");
  
      if(verifyTasks.length > 0){
        await doingTasks(blum);
      }
    }

    let err = 0;

    //? Play when pass > 50
    if(blum.balance.playPasses > MIN_PLAY){
      while (blum.balance.playPasses > STOP_PLAY) {
        await blum.play().catch(() => {
          err += 1;
        });
        if (err > 5) {
          await Helper.delaySimple(
            3000,
            getFullName(blum.account),
            `⚠️ ${colors.red("Failed to play game something wen't wrong")}`,
            "INFO"
          );
          logger.error(err);
          break;
        }
      }
    }else{
      await Helper.delaySimple(
        1000,
        getFullName(blum.account),
        `⚠️ Minimum Play Passes is : ${colors.yellow(`> ${MIN_PLAY}`)}`,
        "INFO"
      );
    }

    await Helper.delaySimple(
      60 * 60 * 1000,
      getFullName(blum.account),
      `✅ Account Processing Complete, Delaying for 1 hour`,
      "INFO"
    );
    await runGame(acc, query, queryObj, proxy);
  } catch (error) {
    const fullName = Helper.getAccountName(acc.firstName, acc.lastName)
    await Helper.delaySimple(
      10000,
      fullName,
      `⚠️ ${error}, Retrying after 10 Second`
    );
    await runGame(acc, query, queryObj, proxy);
  }
}

async function doingTasks(blum){
  const uncompletableTaskIds = [
    "a90d8b81-0974-47f1-bb00-807463433bde",
    "03e4a46f-7588-4950-8289-f42787e3eca2",
  ];

  const uncompletedTasks = blum.tasks.filter(
    (task) =>
      task.status !== "FINISHED" &&
      task.type !== "WALLET_CONNECTION" &&
      task.type !== "PROGRESS_TARGET" &&
      task.type !== "INTERNAL" &&
      !uncompletableTaskIds.includes(task.id)
  );

  for (const task of uncompletedTasks) {
    if (task.status === "NOT_STARTED") {
      await blum.startAndCompleteTask(task.id);
    } else if (task.status === "READY_FOR_VERIFY") {
      const answer = TASKANSWER.getAnswer(task.id);
      if (answer) {
        await blum.validateAndCompleteTask(task.id, answer);
      }else{
        await Helper.delaySimple(
          1000,
          getFullName(blum.account),
          `Task ${colors.cyan(task.id)} | ${colors.red('Keyword Not Found')}`,
          "INFO"
        );
      }
    } else {
      await blum.completeTask(task.id);
    }
  }
}

let init = false;

async function startBot(playMode) {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info(`BOT STARTED`);

      const tele = await new Telegram();
      
      if(!playMode){
        if (init == false) {
          await tele.init();
          init = true;
        }
      }else{
        init = true;
      }

      const accountList = Helper.getSession("accounts");
      const paramList = [];

      if (proxyList.length > 0) {
        if (accountList.length != proxyList.length) {
          reject(
            `You have ${accountList.length} Session but you provide ${proxyList.length} Proxy`
          );
        }
      }

      for (const acc of accountList) {
        const accIdx = accountList.indexOf(acc);
        const proxy = proxyList.length > 0 ? proxyList[accIdx] : undefined;
        if (!acc.includes("query")) {
          await tele.useSession("accounts/" + acc, proxy);
          tele.session = acc;
          const user = await tele.client.getMe();
          const query = await tele
            .resolvePeer()
            .then(async () => {
              return await tele.initWebView();
            })
            .catch((err) => {
              throw err;
            });

          const queryObj = Helper.queryToJSON(query);
          await tele.disconnect();
          paramList.push([user, query, queryObj, proxy]);
        } else {
          const query = Helper.readQueryFile("accounts/" + acc + "/query.txt");
          const queryObj = Helper.queryToJSON(query);
          const user = queryObj.user;
          user.firstName = user.first_name;
          user.lastName = user.last_name;
          paramList.push([user, query, queryObj, proxy]);
        }
      }

      const promiseList = paramList.map(async (data) => {
        await runGame(data[0], data[1], data[2], data[3]);
      });

      await Promise.all(promiseList);
      resolve();
    } catch (error) {
      logger.info(`BOT STOPPED`);
      logger.error(JSON.stringify(error));
      reject(error);
    }
  });
}

(async () => {
  try {
    logger.info("");
    logger.clear();
    logger.info("Application Started");
    await startBot(playMode);
  } catch (error) {
    console.error("Error in main process:", error);
    logger.info(`Application Error : ${error}`);
    throw error;
  }
})();
