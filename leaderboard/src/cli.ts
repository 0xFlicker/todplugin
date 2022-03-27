import "dotenv/config";
import { PubSub } from "@google-cloud/pubsub";
import interval from "postgres-interval";
import Bottleneck from "bottleneck";
import program from "commander";
import { client as createClient, primer } from "./legacy";
import blueprint from "./blueprint";
import {
  filter as deleteFilter,
  single as deleteSingle,
} from "./commands/delete";
import {
  filter as maintenanceFilter,
  single as maintenanceSingle,
} from "./commands/maintenance";

program
  .command("delete:multiple <name>")
  .description("deletes leaderboard data")
  .action(async (name) => {
    const $ = blueprint.factory();
    try {
      const deleter = await $(deleteFilter);
      await deleter(name);
    } catch (error) {
      console.error(error);
    }
  });

program
  .command(
    "maintenance:single <experience> <location> <mode> <period> <revision> <maintenance>"
  )
  .description("NO EFFECT")
  .action(
    async (
      experience: string,
      location: string,
      mode: string,
      name: string,
      revision: string,
      inmode: string
    ) => {
      const $ = blueprint.factory();
      if (!["true", "false"].includes(inmode)) {
        throw new Error("Mode must be true or false");
      }
      const inMaintenance = inmode === "true";
      const maintenance = await $(maintenanceFilter);
      await maintenance(
        experience,
        location,
        mode,
        name,
        revision,
        inMaintenance
      );
    }
  );

program
  .command("maintenance:multiple <name> <maintenance>")
  .description("sets leaderboard to maintenance mode")
  .action(async (name: string, mode: string) => {
    const $ = blueprint.factory();
    if (!["true", "false"].includes(mode)) {
      throw new Error("Mode must be true or false");
    }
    const inMaintenance = mode === "true";
    const maintenance = await $(maintenanceSingle);
    await maintenance(name, inMaintenance);
  });

program
  .command("delete:single <experience> <location> <mode> <period> <revision>")
  .description("deletes leaderboard data")
  .action(
    async (
      experience: string,
      location: string,
      mode: string,
      name: string,
      revision: string
    ) => {
      try {
        await deleteSingle(experience, location, mode, name, revision);
      } catch (error) {
        console.error(error);
      }
    }
  );

program
  .command("push")
  .description("load some data into leaderboard")
  .option("-i, --interval <period>", "Postgres interval to load")
  .option("-r, --rate", "time")
  .action(async ({ rate, period }) => {
    const client = await createClient();
    const prime = await primer(
      client,
      (period && interval(period).toPostgres()) || "24 hours"
    );
    const pubsub = new PubSub();
    const topic = pubsub.topic("SCORES");
    const bottleneck = new Bottleneck({
      maxConcurrent: 1,
      minTime: rate || 3000,
    });
    for (let score of [...prime()]) {
      bottleneck.schedule(() => topic.publishJSON(score));
    }
  });

program
  .command("sessions")
  .description("lists past day sessionData")
  .option("-f, --filter  <experience>", "Filter for a specific experience")
  .option("-i, --interval <period>", "Postgres interval to load")
  .action(async ({ filter, period }) => {
    const client = await createClient();
    const prime = await primer(client, period || "24 hours");
    console.log(
      JSON.stringify(
        [...prime()].filter(
          (score) => !filter || score.experience.id === filter
        )
      )
    );
  });

program.parse(process.argv);
