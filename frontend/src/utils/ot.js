// Client-side Operational Transformation utilities

export class InsertOperation {
  constructor(position, content, version) {
    this.type = "INSERT";
    this.position = position;
    this.content = content;
    this.version = version;
    this.opId = undefined;
  }
}

export class DeleteOperation {
  constructor(position, length, version) {
    this.type = "DELETE";
    this.position = position;
    this.length = length;
    this.version = version;
    this.opId = undefined;
  }
}

export class OperationalTransformation {
  static transform(op1, op2) {
    // Do not mutate inputs; always work on clones/copies and return a new op
    const op1Copy = { ...op1 };
    const op2Copy = { ...op2 };
    if (op1Copy.type === "INSERT" && op2Copy.type === "INSERT") {
      return this.transformInsertInsert(op1Copy, op2Copy);
    } else if (op1Copy.type === "INSERT" && op2Copy.type === "DELETE") {
      return this.transformInsertDelete(op1Copy, op2Copy);
    } else if (op1Copy.type === "DELETE" && op2Copy.type === "INSERT") {
      return this.transformDeleteInsert(op1Copy, op2Copy);
    } else if (op1Copy.type === "DELETE" && op2Copy.type === "DELETE") {
      return this.transformDeleteDelete(op1Copy, op2Copy);
    }
    return op1Copy;
  }

  static transformInsertInsert(op1, op2) {
    const result = { ...op1 };
    if (result.position < op2.position) {
      return result;
    } else if (result.position > op2.position) {
      result.position += op2.content.length;
      return result;
    } else {
      // Same position, assume op1 has priority; return unchanged result
      return result;
    }
  }

  static transformInsertDelete(op1, op2) {
    const result = { ...op1 };
    if (result.position <= op2.position) {
      return result;
    } else {
      result.position -= op2.length;
      return result;
    }
  }

  static transformDeleteInsert(op1, op2) {
    const result = { ...op1 };
    if (result.position < op2.position) {
      return result;
    } else {
      result.position += op2.content.length;
      return result;
    }
  }

  static transformDeleteDelete(op1, op2) {
    const result = { ...op1 };
    if (result.position < op2.position) {
      return result;
    } else if (result.position > op2.position) {
      result.position -= op2.length;
      return result;
    } else {
      // Same position, delete the overlapping part
      const overlap = Math.min(result.length, op2.length);
      result.length -= overlap;
      if (result.length < 0) result.length = 0;
      return result;
    }
  }
}

// Apply operation to content string
export function applyOperation(content, operation) {
  if (operation.type === "INSERT") {
    return (
      content.slice(0, operation.position) +
      operation.content +
      content.slice(operation.position)
    );
  } else if (operation.type === "DELETE") {
    return (
      content.slice(0, operation.position) +
      content.slice(operation.position + operation.length)
    );
  }
  return content;
}

// Transform local operation against a list of pending operations
export function transformAgainstPending(localOp, pendingOps) {
  let transformedOp = { ...localOp };
  for (const pendingOp of pendingOps) {
    transformedOp = OperationalTransformation.transform(
      transformedOp,
      pendingOp
    );
  }
  return transformedOp;
}

// Ensure incoming op is safe relative to current content length
export function sanitizeOperation(operation, contentLength) {
  const op = { ...operation };
  if (op.type === "INSERT") {
    if (op.position < 0) op.position = 0;
    if (op.position > contentLength) op.position = contentLength;
    if (!op.content) op.content = "";
    return op;
  }
  if (op.type === "DELETE") {
    if (op.position < 0) op.position = 0;
    if (op.position > contentLength) op.position = contentLength;
    if (!op.length || op.length < 0) op.length = 0;
    // Clamp length so deletion doesn't exceed content boundaries
    if (op.position + op.length > contentLength) {
      op.length = Math.max(0, contentLength - op.position);
    }
    return op;
  }
  return op;
}
