import config from "./config";
import { interceptWebpack } from "./patcher";

// todo: magicrequire everywhere impl
if (config) {
  interceptWebpack();
}
