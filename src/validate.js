class ConfigValidationError extends Error {}

export function validateProperty(name, object, key, required, validationCallback) {
  if (!Object.prototype.hasOwnProperty.call(object, [key])) {
    if (required) {
      throw new ConfigValidationError(`Required property not found, missing ${key} in ${name}`);
    } else {
      return;
    }
  } else {
    if (!validationCallback(object[key])) {
      throw new ConfigValidationError(
        `Failed to validate ${key} in ${name}. The following check failed: \n${validationCallback.toString()}`,
      );
    }
  }
}
