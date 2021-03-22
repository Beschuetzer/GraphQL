const express = require('express');

const {graphqlHTTP} = require('express-graphql');
const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLNonNull,
} = require('graphql');
const app = express();

//#region Mock Data
const authors = [
	{ id: 1, name: 'J. K. Rowling' },
	{ id: 2, name: 'J. R. R. Tolkien' },
	{ id: 3, name: 'Brent Weeks' }
]

const books = [
	{ id: 1, name: 'Harry Potter and the Chamber of Secrets', authorId: 1 },
	{ id: 2, name: 'Harry Potter and the Prisoner of Azkaban', authorId: 1 },
	{ id: 3, name: 'Harry Potter and the Goblet of Fire', authorId: 1 },
	{ id: 4, name: 'The Fellowship of the Ring', authorId: 2 },
	{ id: 5, name: 'The Two Towers', authorId: 2 },
	{ id: 6, name: 'The Return of the King', authorId: 2 },
	{ id: 7, name: 'The Way of Shadows', authorId: 3 },
	{ id: 8, name: 'Beyond the Shadows', authorId: 3 }
]
//#endregion

//Defining what a 'Book' is
const BookType = new GraphQLObjectType({
  name: 'Book',
  description: 'This represents a book written by an author',
  fields: () => ({
    id: {type: GraphQLNonNull(GraphQLInt)},
    name: {type: GraphQLNonNull(GraphQLString)},
    authorId: {type: GraphQLNonNull(GraphQLString)},
    author: {
      //A book only has one author (compare to Author type below, which is a one to many)
      type: AuthorType,

      //since author is not a property in the mock data object, we need a custom resolve telling graphQL what to return for this field
      //resolve is called with two argument(parent [type that this is], args)
      resolve: (book) => {
        return authors.find(author => author.id === book.authorId)
      }
    }
  })
})

//defining what an "Author" is
const AuthorType = new GraphQLObjectType({
  name: 'Author',
  description: 'Represents an Author',
  fields: () => ({
    id: {type: GraphQLNonNull(GraphQLInt)},
    name: {type: GraphQLNonNull(GraphQLString)},
    books: {
      type: new GraphQLList(BookType),
      resolve: (author) => {
        return books.filter(book => book.authorId === author.id)
      }
    }
  })
})

//this is the first level of queryable fields: e.g. 
//{
//  authors/books {
//    name
//    id
//    ...
//  }
//}
const RootQueryType = new GraphQLObjectType({
  name: "Query",
  description: 'Root Query',
  fields: () => ({
    books: {
      type: new GraphQLList(BookType),
      description: 'List of books',
      resolve: () => books
    },
    authors: {
      type: new GraphQLList(AuthorType),
      description: "List of Authors",
      resolve: () => authors
    },
  }),
})

const schema = new GraphQLSchema({
  query: RootQueryType,
})

app.use('/graphql', graphqlHTTP({
  graphiql: true,
  schema,
}))
app.listen(5000, () => {console.log("server running!")})