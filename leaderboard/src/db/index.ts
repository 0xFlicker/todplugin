import { Factory } from "shutterstock-mold";
import createDb from "./dynamodb";

export default {
  db($: Factory) {
    return $(createDb);
  },
};
