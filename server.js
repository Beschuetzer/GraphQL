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
  //fields has to be a function that returns an obj. because if you just return an object, you will run into Reference error saying a AuthorType/BookType is not defined when cros-referencing between types
  fields: () => ({
    id: {type: GraphQLNonNull(GraphQLInt)},
    name: {type: GraphQLNonNull(GraphQLString)},
    authorId: {type: GraphQLNonNull(GraphQLString)},
    author: {
      //A book only has one author (compare to Author type below, which is a one to many)
      type: AuthorType,

      //since author is not a property in the mock data object, we need a custom resolve telling graphQL what to return for this field
      //resolve is a function called with two arguments(parent [type that this is], args)
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
    book: {
      type: BookType,
      description: "A single book",
      //The args obj. below defines what args are passed into resolve (..., args) method below
      args: {
        id: {type: GraphQLInt}
      },
      resolve: (book, args) => {
        return books.find(book => book.id === args.id)
      }
    },
    books: {
      type: new GraphQLList(BookType),
      description: 'List of books',
      resolve: () => books
    },
    author: {
      type: AuthorType,
      description: 'A single Author',
      args: {
        id: {type: GraphQLInt},
        name: {type: GraphQLString},
      },
      resolve: (author, args) => authors.find(author => author.id === args.id || (new RegExp(makeRegexIgnoreSpace(args.name), 'ig')).test(author.name))
    },
    authors: {
      type: new GraphQLList(AuthorType),
      description: "List of Authors",
      resolve: () => authors
    },
  }),
})

const RootMutationType = new GraphQLObjectType({
  name: "Mutation",
  description: 'Root Mutation',
  fields: () => ({
    //fields are the different operations for each mutation
    addBook: {
      type: BookType,
      description: "Add a book",
      args: {
        //GraphQLNonNull means null can't be passed in therefore it is required when making query
        authorId: {type: GraphQLNonNull(GraphQLInt)},
        name: {type: GraphQLNonNull(GraphQLString)},
      },
      resolve: (parent, args) => {
        const book = { id: books.length + 1, name: args.name, authorId: args.authorId}
        books.push(book);
        return book;
      }
    },
    addAuthor: {
      type: AuthorType,
      description: 'An Author',
      args: {
        name: {type: GraphQLNonNull(GraphQLString)},
      },
      resolve: (parent, args) => {
        const author = {
          id: authors.length + 1,
          name: args.name,
        }
        authors.push(author);
        return author;
      },
    },
    updateBook: {
      type: BookType,
      description: "Update Book",
      args: {
        name: {type: GraphQLString},
        authorId: {type: GraphQLInt},
        id: {type: GraphQLNonNull(GraphQLInt)},
      },
      resolve: (parent, args) => {
        const book = {};
        if (args.name) book['name'] = args.name;
        if (args.authorId) book['authorId'] = args.authorId;
        const index = books.findIndex(book => book.id === args.id);
        books.splice(index, 1, book);
        return book;
      }
    },
    updateAuthor: {
      type: AuthorType,
      description: 'Update an Author',
      args: {
        id: {type: GraphQLNonNull(GraphQLInt)},
        name: {type: GraphQLString},
      },
      resolve: (currentAuthor, args) => {
        const newAuthor = {...currentAuthor};
        if (args.name) newAuthor['name'] = args.name;
        const index = authors.findIndex(author => author.id === args.id);
        authors.splice(index, 1, newAuthor);
        return newAuthor;
      }
    }
  })
})

const schema = new GraphQLSchema({
  //Type used to make queries
  query: RootQueryType,
  //Type used to mutate/make changes
  mutation: RootMutationType,
})

app.use('/graphql', graphqlHTTP({
  graphiql: true,
  schema,
}))
app.listen(5000, () => {console.log("server running!")})


function makeRegexIgnoreSpace(str) {
  return str.split('')
    .map(char => `\\s*${char}`)
    .join('')
    .replace(' ', '')
}