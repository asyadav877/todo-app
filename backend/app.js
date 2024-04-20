
const express = require("express");
const fs = require("fs");
const zod  = require("zod");
const app = express();

const PORT = process.env.PORT || 3000;
const todoFile = process.env.fileName || "todo_db.json";

app.use(express.json());



const bodySchema = zod.object({
    title: zod.string().max(50),
    description: zod.string().max(200),
    dueDate: zod.string().pipe(zod.coerce.date())
})

const updateTodoSchema = zod.object({
    description: zod.string().max(200),
    dueDate: zod.string().pipe(zod.coerce.date())
});


function readFile(){
    let data = fs.readFileSync(todoFile, "utf-8");
    return JSON.parse(data);
}

function updateFile(data){
    try{
        data = JSON.stringify(data);
        fs.writeFileSync(todoFile, data, {encoding: 'utf-8', flag: 'w+'});
        return true;
    }catch(err){
        console.log(err);
        return false;
    }
}

function validateBody(req, res, next){
    const data = req.body;
    if(bodySchema.safeParse(data).success) next();
    else res.status(401).json({msg: "Invalid todo body"});
}

function updateTodoBody(req, res, next){
    const data = req.body;
    if(updateTodoSchema.safeParse(data).success) next();
    else res.status(401).json({msg: "Invalid update todo body"});
}

function idGenerator(){
    return Date.now().toString(36);
}

function createTodo(data){
    let todos = readFile();
    todos.push(data);
    return updateFile(todos);
}

function deleteTodo(id){
    const todos = readFile();
    let originalLength = todos.length;
    let newTodos = todos.filter((value) => { return value.id != id});
    if (newTodos.length == originalLength) return false;
    else{
        return updateFile(newTodos);
    }

}

app.get('/', (req, res) => res.status(200).json({ msg: "todo-app"}));

app.get('/getTodo', (req, res) => {
    let data = readFile();
    res.status(200).json(data);
});

app.post('/createTodo', validateBody, (req, res) => {
    let todo = req.body;
    todo['id'] = idGenerator();
    if(createTodo(todo)) {
        res.status(200).json({msg: "todo created, id: " + todo['id']})
    }
    else res.status(500).json({msg: "todo creation failed"});
});

app.delete('/deleteTodo/:id', (req, res) => {
    // delete logic
    const todoId = req.params.id;
    if(deleteTodo(todoId)){
        res.status(201).json({msg: "todo deleted id: " + todoId});
    }
    else{
        res.status(200).json({msg: "todo id: " + todoId + " not found"});
    }
});

app.put('/updateTodo/:id', updateTodoBody, (req, res) => {
    const todoId = req.params.id;
    const body = req.body;

    let todos = readFile();
    let updated = true;
    let updatedTodos = todos.map((value) => {
        if(value.id == todoId){
            console.log(body);
            value['description'] = body.description;
            value['dueDate'] = body.dueDate;
            updated = false;
        }
        return value;
    });
    if(updated) res.status(200).json({
        msg: "todo id: " + todoId + " not found"
    });
    else{
        if(updateFile(updatedTodos)){
            res.status(201).json({msg: "todo updated id: " + todoId});
        }else{
            res.status(500).json({msg: "failed to update todo"});
        }
    }

});


app.put('/cleanTodos', (req, res) => {
    let todos = new Array();
    if(updateFile(todos)){
        res.status(200).json({
            msg: "All todos deleted!"
        });
    }
    else{
        res.status(500).json({
            msg: "todos cleanup failed"
        });
    }
});


app.listen(PORT, () => console.log("Listening on port " + PORT));