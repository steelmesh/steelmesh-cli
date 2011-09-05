# Steelmesh Command Line Interface (Mesh)

In essence, a Steelmesh application works and is prepared in a very similar manner to a standard [CouchApp](http://couchapp.org/).  The `mesh` command-line tool wraps the [node.couchapp.js](https://github.com/mikeal/node.couchapp.js) implementation and then does a few extra bits and pieces to make the couchapp Steelmesh compatible.

## Usage

First install the mesh package from npm:

```
npm install mesh
```

### Initializing a Project

Then if you are starting a new project, you may like to scaffold a project using the init action:

```
mesh init
```

If you with to initialize a project in a directory other than the current directory, specify the path option:

```
mesh -p <path> init
```

### Publishing a Project

