const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require("./model");
const Sequelize = require('sequelize');

exports.helpCmd = (socket, rl) =>{
		log(socket, "COMANDOS:");
  		log(socket, "h|help -- mostrar todos los comandos");
  		log(socket, "List -- mostrar lista de preguntas ");
  		log(socket, "show <id> -- mostrar respuesta de la pregunta con el id indicado");
  		log(socket, "add -- añadir pregunta y respuesta");
  		log(socket, "delete <id> -- borrar pregunta con el id indicado");
  		log(socket, "edit <id> -- editar pregunta y respuesta con el id indicado");
  		log(socket, "test <id> -- hacer prueba de la pregunta con el id indicado");
  		log(socket, "p|play -- jugar una partida de preguntas aleatorias");
  		log(socket, "credits -- mostrar creditos");
  		log(socket, "q|quit -- salir del juego");
  		rl.prompt();
};

exports.listCmd = (socket, rl) => {

	models.quiz.findAll()
	.each(quiz => {
			log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

const validateId = (socket, id) => {
	return new Sequelize.Promise((resolve, reject) => {

		if(typeof id === "undefined"){
			reject(new Error(socket, `Falta el parametro <id>.`));
		} else {
			id = parseInt(id);
			if (Number.isNaN(id)){
				reject(new Error(socket, `El valor del parámetro id no es válido.`));
			}else{
				resolve(id);
			}

		}

	});
};

exports.showCmd = (socket, rl, id) => {

	validateId(socket, id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz) {
			throw new Error(socket, `No existe un quiz asociado al id=${id}.`);
		}
		log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(()=>{
		rl.prompt();
	});
};

const makeQuestion = (rl, text) => {
	return new Sequelize.Promise((resolve, reject) => {
		rl.question(colorize(text, 'red'), answer => {
			resolve(answer.trim());
		});
	});
};

exports.addCmd = (socket, rl) => {
	makeQuestion(rl, 'Introduzca la pregunta')
	.then(q =>  {
		return makeQuestion(rl, 'Introduzca la respuesta')
		.then(a => {
			return {question: q, answer: a};
		});
	})
	.then(quiz => {
		return models.quiz.create(quiz);
	})
	.then(quiz => {
		log(socket, `${colorize('Se ha añadido magenta', 'magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(socket, 'El quiz es erroneo.');
		error.errors.forEach(({message}) => errorlog(socket, message));
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(()=>{
		rl.prompt();
	});
};

exports.deleteCmd = (socket, rl, id) => {
	validateId(socket, id)
	.then(id => models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

exports.editCmd = (socket, rl, id) => {
	validateId(socket, id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz){
			throw new Error(socket, `No existe un quiz asociado al id=${id}.`);
		}
		process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
		return makeQuestion(rl, 'Introduzca la pregunta: ')
		.then(q => {
			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
			return makeQuestion(rl, 'Introduzca la respuesta: ')
			.then(a => {
				quiz.question = q;
				quiz.answer = a;
				return quiz;
			});
		});
	})
	.then(quiz => {
		return quiz.save();
	})
	.then(quiz => {
		log(socket, `Ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(socket, 'El quiz es erroneo.');
		error.errors.forEach(({message}) => errorlog(socket, message));
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(()=>{
		rl.prompt();
	});
};
exports.testCmd = (socket, rl, id) => {
	validateId(socket, id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz){
			throw new Error(socket, `No existe un quiz asociado al id=${id}.`);
		}
		return makeQuestion(rl, `${quiz.question}?`)
		.then(a => {
			a = a.toLowerCase();
			quiz.answer = quiz.answer.toLowerCase();

			if(a === quiz.answer){
				log(socket, 'Su respuesta es correcta.');
			}else{
				log(socket, 'Su respuesta es incorrecta.');
			}
		});	
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(socket, 'El quiz es erroneo.');
		error.errors.forEach(({message}) => errorlog(socket, message));
	})
	.catch(error => {
		errorlog(socket, error.message);
	})
	.then(()=>{
		rl.prompt();
	});
};

exports.playCmd = (socket, rl) => {
		
	let score = 0;
	let toBeSolved = [];
	let indexAux = [];

	models.quiz.findAll()
	.each(quiz => {
		toBeSolved.push(quiz.get({plain:true}));
	})
	.then(()=>{	

		const playOne = () => {

			if(toBeSolved.length < 1){
				log(socket, colorize(`No hay nada más que preguntar.Fin del juego. Aciertos: ${score}`));
				rl.prompt();
			}else{
				var len = toBeSolved.length;
				let index = Math.floor(Math.random() * len);
				validateId(socket, index)
				.then(id => toBeSolved[index])
				.then(quiz => {
					if(!quiz){
						throw new Error(socket, `No existe un quiz asociado al id=${id}.`);
					}
					return makeQuestion(rl, `${quiz.question}?`)
					.then(a => {
						a = a.toLowerCase();
						quiz.answer = quiz.answer.toLowerCase();
						
					if(a === quiz.answer){
						score++;
						log(socket, `Respuesta correcta. Lleva ${score} aciertos`);
						toBeSolved.splice(index,1);
						playOne();
					}else{
						log(socket, `Respuesta incorrecta.Fin del juego. Aciertos: ${score}`);
						rl.prompt();
					}

					});
				});	
			}
		};
		playOne();		
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog(socket, 'El quiz es erroneo.');
		error.errors.forEach(({message}) => errorlog(socket, message));
	})
	.catch(error => {
		errorlog(socket, error.message);
	});
};	

exports.creditsCmd = (socket, rl) => {
	log(socket, 'Autor de la práctica:');
    log(socket, 'NICOLAS ARRIETA LARRAZA');
    rl.prompt();
};

exports.closeCmd = (socket, rl) => {
	rl.close();
	socket.end();
};