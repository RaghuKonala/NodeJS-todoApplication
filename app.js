const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
var isMatch = require("date-fns/isMatch");

const dbPath = path.join(__dirname, "todoApplication.db");
const app = express();
app.use(express.json());

let database;

const initializeDBandServer = async () => {
  try {
    database = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Database Error is ${error.message}`);
    process.exit(1);
  }
};
initializeDBandServer();

const resultOutput = (dataObject) => {
  return {
    id: dataObject.id,
    todo: dataObject.todo,
    priority: dataObject.priority,
    status: dataObject.status,
    category: dataObject.category,
    dueDate: dataObject.due_date,
  };
};

/* functions */
const hasPriorityAndStatus = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriority = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatus = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasSearch = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasCategory = (requestQuery) => {
  return requestQuery.category !== undefined;
};

/* Value Check */
const priorityCheck = (value) => {
  const condition =
    `${value}` === "HIGH" || `${value}` === "MEDIUM" || `${value}` === "LOW";
  return condition;
};
const statusCheck = (value) => {
  const condition =
    `${value}` === "TO DO" ||
    `${value}` === "IN PROGRESS" ||
    `${value}` === "DONE";
  return condition;
};
const categoryCheck = (value) => {
  const condition =
    `${value}` === "WORK" || `${value}` === "HOME" || `${value}` === "LEARNING";
  return condition;
};

/*    Get Todos */
app.get("/todos/", async (request, response) => {
  let getTodosQuery = "";
  let data = null;
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatus(request.query):
      if (priorityCheck(priority)) {
        if (statusCheck(status)) {
          getTodosQuery = `SELECT * FROM todo WHERE priority='${priority}' AND status='${status}';`;
          data = await database.all(getTodosQuery);
          response.send(data.map((eachTodo) => resultOutput(eachTodo)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case hasCategoryAndStatus(request.query):
      if (categoryCheck(category)) {
        if (statusCheck(status)) {
          getTodosQuery = `
                SELECT * 
                FROM todo
                WHERE category = '${category}' AND status='${status}';`;
          data = await database.all(getTodosQuery);
          response.send(data.map((eachTodo) => resultOutput(eachTodo)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    case hasCategoryAndPriority(request.query):
      if (categoryCheck(category)) {
        if (priorityCheck(priority)) {
          getTodosQuery = `
                SELECT * 
                FROM todo
                WHERE category = '${category}' AND priority='${priority}';`;
          data = await database.all(getTodosQuery);
          response.send(data.map((eachTodo) => resultOutput(eachTodo)));
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    case hasPriority(request.query):
      if (priorityCheck(priority)) {
        getTodosQuery = `
                SELECT * 
                FROM todo
                WHERE priority='${priority}';`;
        data = await database.all(getTodosQuery);
        response.send(data.map((eachTodo) => resultOutput(eachTodo)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case hasStatus(request.query):
      if (statusCheck(status)) {
        getTodosQuery = `
                SELECT * 
                FROM todo
                WHERE status='${status}';`;
        data = await database.all(getTodosQuery);
        response.send(data.map((eachTodo) => resultOutput(eachTodo)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    case hasSearch(request.query):
      getTodosQuery = `
                SELECT * 
                FROM todo
                WHERE todo LIKE '%${search_q}%';`;
      data = await database.all(getTodosQuery);
      response.send(data.map((eachTodo) => resultOutput(eachTodo)));
      break;

    case hasCategory(request.query):
      if (categoryCheck(category)) {
        getTodosQuery = `
                SELECT * 
                FROM todo
                WHERE category='${category}';`;
        data = await database.all(getTodosQuery);
        response.send(data.map((eachTodo) => resultOutput(eachTodo)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    default:
      getTodosQuery = `SELECT * FROM todo;`;
      data = await database.all(getTodosQuery);
      response.send(data.map((eachTodo) => resultOutput(eachTodo)));
  }
});

/* API 2 Get Todo */
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id= ${todoId}`;
  const todoData = await database.get(getTodoQuery);
  response.send(resultOutput(todoData));
});

/* API 3 GET todo by due_date */
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isMatch(date, "yyyy-MM-dd") && isValid(new Date(date))) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const todoQuery = `SELECT * FROM todo WHERE due_date = '${newDate}';`;
    const todoDetails = await database.all(todoQuery);
    response.send(todoDetails.map((eachDetail) => resultOutput(eachDetail)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

/* API 4 POST todo */
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  if (priorityCheck(priority)) {
    if (statusCheck(status)) {
      if (categoryCheck(category)) {
        if (isMatch(dueDate, "yyyy-MM-dd") && isValid(new Date(dueDate))) {
          const newDate = format(new Date(dueDate), "yyyy-MM-dd");
          const postQuery = `INSERT INTO
                            todo(id, todo, priority, status, category, due_date)
                        VALUES(
                            ${id}, '${todo}', '${priority}', '${status}', '${category}', '${newDate}'
                        );`;
          await database.run(postQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

/* API 5 PUT todo */
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  const requestBody = request.body;

  let putQuery;
  let updateColumn = "";

  switch (true) {
    case requestBody.status !== undefined:
      if (statusCheck(status)) {
        putQuery = `UPDATE todo SET status='${status}' WHERE id=${todoId};`;
        await database.run(putQuery);
        response.send("Status Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case requestBody.priority !== undefined:
      if (priorityCheck(priority)) {
        putQuery = `UPDATE todo SET priority='${priority}' WHERE id = ${todoId};`;
        await database.run(putQuery);
        response.send("Priority Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case requestBody.todo !== undefined:
      putQuery = `UPDATE todo SET todo='${todo}' WHERE id = ${todoId};`;
      await database.run(putQuery);
      response.send("Todo Updated");
      break;

    case requestBody.category !== undefined:
      if (categoryCheck(category)) {
        putQuery = `UPDATE todo SET category='${category}' WHERE id = ${todoId};`;
        await database.run(putQuery);
        response.send("Category Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    case requestBody.dueDate !== undefined:
      if (isMatch(dueDate, "yyyy-MM-dd") && isValid(new Date(dueDate))) {
        const newDate = format(new Date(dueDate), "yyyy-MM-dd");
        putQuery = `UPDATE todo SET due_date='${newDate}' WHERE id = ${todoId};`;
        await database.run(putQuery);
        response.send("Due Date Updated");
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
  }
});

/* API 6 DELETE todo */
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id= ${todoId};`;
  await database.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
