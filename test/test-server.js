const chai = require("chai");
const chaiHttp = require("chai-http");

const { app, runServer, closeServer } = require("../server");

// this lets us use *expect* style syntax in our tests
// so we can do things like `expect(1 + 1).to.equal(2);`
// http://chaijs.com/api/bdd/
const expect = chai.expect;

// This let's us make HTTP requests
// in our tests.
// see: https://github.com/chaijs/chai-http
chai.use(chaiHttp);

describe.skip("Shopping List", function() {
  // Before our tests run, we activate the server. Our `runServer`
  // function returns a promise, and we return the that promise by
  // doing `return runServer`. If we didn't return a promise here,
  // there's a possibility of a race condition where our tests start
  // running before our server has started.
  before(function() {
    return runServer();
  });

  // although we only have one test module at the moment, we'll
  // close our server at the end of these tests. Otherwise,
  // if we add another test module that also has a `before` block
  // that starts our server, it will cause an error because the
  // server would still be running from the previous tests.
  after(function() {
    return closeServer();
  });

  // test strategy:
  //   1. make request to `/shopping-list`
  //   2. inspect response object and prove has right code and have
  //   right keys in response object.
  it("should list items on GET", function() {
    // for Mocha tests, when we're dealing with asynchronous operations,
    // we must either return a Promise object or else call a `done` callback
    // at the end of the test. The `chai.request(server).get...` call is asynchronous
    // and returns a Promise, so we just return it.
    return chai
      .request(app)
      .get("/shopping-list")
      .then(function(res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a("array");

        // because we create three items on app load
        expect(res.body.length).to.be.at.least(1);
        // each item should be an object with key/value pairs
        // for `id`, `name` and `checked`.
        const expectedKeys = ["id", "name", "checked"];
        res.body.forEach(function(item) {
          expect(item).to.be.a("object");
          expect(item).to.include.keys(expectedKeys);
        });
      });
  });

  // test strategy:
  //  1. make a POST request with data for a new item
  //  2. inspect response object and prove it has right
  //  status code and that the returned object has an `id`
  it("should add an item on POST", function() {
    const newItem = { name: "coffee", checked: false };
    return chai
      .request(app)
      .post("/shopping-list")
      .send(newItem) //***DAVID:   .send() is what we use to represent the body:{} header in a REQUEST. (not to be confused with the res.send() where we use to send back content in API code) 
      .then(function(res) {
        expect(res).to.have.status(201);
        expect(res).to.be.json;
        expect(res.body).to.be.a("object");
        expect(res.body).to.include.keys("id", "name", "checked");
        expect(res.body.id).to.not.equal(null);
        // response should be deep equal to `newItem` from above if we assign
        // `id` to it from `res.body.id`
        expect(res.body).to.deep.equal(
          Object.assign(newItem, { id: res.body.id }) //***DAVID:  Object.assign() is like when we add a new key to the setState(). It accepts 2 parameters, the object we are upgrading, and an object with keys we are trying to merge it to.
        );

      });

  });

  // test strategy:
  //  1. initialize some update data (we won't have an `id` yet)
  //  2. make a GET request so we can get an item to update
  //  3. add the `id` to `updateData`
  //  4. Make a PUT request with `updateData`
  //  5. Inspect the response object to ensure it
  //  has right status code and that we get back an updated
  //  item with the right data in it.
  it("should update items on PUT", function() {
    // we initialize our updateData here and then after the initial
    // request to the app, we update it with an `id` property so
    // we can make a second, PUT call to the app.
    const updateData = {
      name: "foo",
      checked: true
    };

    return (
      chai
        .request(app)
        // first have to get so we have an idea of object to update
        .get("/shopping-list")
        .then(function(res) {
          updateData.id = res.body[0].id;
          // this will return a promise whose value will be the response
          // object, which we can inspect in the next `then` block. Note
          // that we could have used a nested callback here instead of
          // returning a promise and chaining with `then`, but we find
          // this approach cleaner and easier to read and reason about.
          return chai
            .request(app)
            .put(`/shopping-list/${updateData.id}`)
            .send(updateData);
        })
        // prove that the PUT request has right status code
        // and returns updated item
        .then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body).to.deep.equal(updateData);
        })
    );
  });

  // test strategy:
  //  1. GET shopping list items so we can get ID of one
  //  to delete.
  //  2. DELETE an item and ensure we get back a status 204
  it("should delete items on DELETE", function() {
    return (
      chai
        .request(app)
        // first have to get so we have an `id` of item
        // to delete
        .get("/shopping-list")
        .then(function(res) {
          return chai.request(app).delete(`/shopping-list/${res.body[0].id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
        })
    );
  });
});//**************************************************END of SHOPPINGLIST Test Suite******************************************************************************



//Test Suite for Recipes Route
describe("Recipes", ()=> {

  before(function(){
    return runServer();
  });

  after(function(){
    return closeServer();
  });

  // test strategy for GET:
  //  1: make request to `/recipes`
  //  2: inspect response object and prove has correct data and is correct schema (shape, keys etc..).
  it("get('/recipes') should list current recipe objects in the Recipes.items array", function(){
    //must return a promise when working with async in mocha.
    return chai
      .request(app)
      .get("/recipes")
      .then(function(res){
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a("array");
        //remember in server.js we created some default recipes that we create on app load. let's test the length of res obj to make sure they got generated.
        expect(res.body.length).to.be.at.least(1);
        ////(still in same "it" block) now we are testing the schema details of the response object.(we kinda already started by asserting it be an array)
        //schema: each object array item should be an "object" w/keys "id", "name", and "ingredients"
        const expectedKeys = ["id", "name", "ingredients"];
        //cycle over each item in res and for each item, run the expect to include keys(expectedKeys);
        res.body.forEach(recipe=> {
          expect(recipe).to.be.a("object"); //just checking that each recipe is at least an object first.
          expect(recipe).to.include.keys(expectedKeys);
        });

      });

  });//----end of "it" block for get("/recipes")-------------------------------------------


  //test strategy for post("/recipes")
  //  1. make a post request to recipes with data for a new recipe using send() to include the data like you would in the request body.
  // 2. inspect response object and prove it has right status code and that returned recipe has a newly generated "id" key.
  it("post('/recipes') should add a recipe item to Recipes.items array ", function(){
    
    const newRecipe = {name: "hot chocolate", ingredients: ["water", "cocoa", "almond milk"]}; //prep new recipe to post.

    return chai
      .request(app)
      .post("/recipes")
      .send(newRecipe)
      .then(function(res){
        expect(res).to.have.status(201);
        expect(res).to.be.json;
        expect(res.body).to.be.a("object"); //when we post a new recipe object, we also get it returned to us to see what we posted.
        expect(res.body).to.include.keys("id", "name", "ingredients");
        expect(res.body.id).to.not.equal(null);//returned recipe object should now have an id after posting it.
        /*now we are going to take the "newRecipe" blueprint we made above as a const and we are going to assign it the id that is in the 
          res and we are going to compare that recipe to the returned recipe in res.body to make sure they match. */
        const newRecipeWithId = Object.assign(newRecipe, {id: res.body.id});
        expect(res.body).to.deep.equal(newRecipeWithId);
      });

  });//----end of "it" block for POST recipes----------------------------------------------

  //test strategy:
  //  1.declare some update data that we will pass. exmaple: let upgrade = {}
  //  2.make GET request and decide which recipe you want to update, (take note of it's "id").
  //  3.add the id of one of the recipes (we'll just pick the 1st) to the update data that you declared earlier, we will pass this update. ex: upgrade.id = res.body[0].id
  //  4.make PUT request to put('/recipes/:upgrade.id) and send(upgrade)
  //  5.then inspect the res object of the put to make sure it's status is 200 or 204 AND that the values match the upgrade object we declared earlier. 
  it("put('/recipes/{insert-id-here}') should update a recipe item in Recipes.items array", function(){
    const upgrade = {name: "hot chocolate", ingredients: ["mountain spring water", "costa rican cocoa", "cinnamon"]}; //it's ok to make a const because the keys will change sure, but not the vairable name. That's all const means, can't change name/memory location.
    
    return chai
      .request(app)
      .get('/recipes')
      .then(function(res){
        console.log("HEY HERES THE ID: ",res.body[0].id);
        upgrade.id = res.body[0].id;
        upgrade.name = res.body[0].name;
        console.log("HEY HERES THE UPGRADE WITH ID: ",upgrade);
        //within this same .then() block, we want to return chai.request(app).put
        return chai
          .request(app)
          .put(`/recipes/${upgrade.id}`)
          .send(upgrade)
        })
          .then(function(res){
            console.log("HEY HERE IS THE RESPONSE BODY",res.body);
            expect(res).to.have.status(204);
            // expect(res).to.be.json;
            // expect(res.body).to.be.a("object");
            // expect(res.body).to.deep.equal(upgrade);
          })


  });//-------end of "it" block for PUT recipes/:id-------------------


})//**************************************************end of Recipes Test Suite**************************************************
