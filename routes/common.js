/*
	app
		->	Servicio Generado por server.js (Necesario para Agregar los metodos segun URL)
	model
		->	model.
		{
			name:				String;				Nombre del model
		,	key:				String; 			Clave Principal del model [id]
		,	assocs:				Array of Object;	Assocs
			[
				{
					name:			String;			Nombre del Assoc
				,	type:			String;			Tipo de Assoc [has-one | has-many | belongs-to | has-and-belongs-to-many]
				}
			]
		}
*/
module.exports
=	function(app)
	{
		
		var	_
		=	require('underscore')
		,	URL
		=	require('url')
		,	Store
		=	app.get('Store')

		var	getCollection
		=	function(url_or_query_collection,model_collection)
			{
				return	_.extend(
							model_collection
						,	_.pick(
								url_or_query_collection
							,	['type','ipp','page']
							)
						)
			}

		_.each(
			app.get('Model')
		,	function(model)
			{
				app.get(
					app.get('base')
				+	model.model_template.expand(
						{
							model_name:		model.name
						}
					)
				,	function(req,res)
					{
						model
							.findAll(
								getCollection(URL.parse(req.url,true).query,model.collection)
							).then(
								function(data)
								{
									app
										.build
											.collection(
												req
											,	model
											,	data
											,	getCollection(
													URL.parse(req.url,true).query
												,	model.collection
												)
											).then(
												function(collection)
												{
													res.send(collection)
												}
											)
								}
							)
					}
				)

				app.get(
					app.get('base')
				+	model.model_id_template.expand(
						{
							model_name:		model.name
						,	model_key:		model.key
						}
					)
				,	function(req,res)
					{
						model
							.findOne(
								req.params[model.key]
							).then(
								function(data)
								{
									app
										.build
											.resource(
												req
											,	model
											,	data
											).then(
												function(resource)
												{
													res.send(resource)
												}
											)
								}
							)
					}
				)

				app.post(
					app.get('base')
				+	model.model_template.expand(
						{
							model_name:		model.name
						}
					)
				,	function(req,res)
					{
						if	(_.isFunction(model[req.body.action]))
							model
								[req.body.action](
									_.extend(
										req.body
									,	{
											collection_query:	getCollection(
																	req.body.collection_query
																||	{}
																,	model.collection
																)
										}
									)
								).then(
									function(data)
									{
										app
											.build
												.resource(
													req
												,	model
												,	data
												).then(
													function(resource)
													{
														res.send(resource)
													}
												)
									}
								)
						else
							res.send(
								app.build.status(400)
							)
					}
				)

				app.put(
					app.get('base')
				+	model.model_id_template.expand(
						{
							model_name:		model.name
						,	model_key:		model.key
						}
					)
				,	function(req,res)
					{
						model
							.update(
								req.params[model.key]
							,	req.body
							).then(
								function(data)
								{
									app
										.build
											.resource(
												req
											,	model
											,	data
											).then(
												function(resource)
												{
													res.send(resource)
												}
											)
								}
							)
					}
				)

				app.delete(
					app.get('base')
				+	model.model_id_template.expand(
						{
							model_name:		model.name
						,	model_key:		model.key
						}
					)
				,	function(req,res)
					{
						model
							.delete(
								req.params[model.key]
							).then(
								function(data)
								{
									app
										.build
											.resource(
												req
											,	model
											,	data
											).then(
												function(resource)
												{
													res.send(resource)
												}
											)
								}
							)
					}
				)

				app.get(
					app.get('base')
				+	model.model_assoc_template.expand(
						{
							model_name:		model.name
						,	model_key:		model.key
						,	model_assoc:	'assoc'
						}
					)
				,	function(req,res)
					{
						Store
							.show(
								model.name
							,	req.params.id
							).then(
								function(data)
								{
									model
										.resolve_assoc(
											req
										,	req.params.assoc
										,	data
										).then(
											function(resource)
											{
												res.send(
													resource
												)
											}
										)
								}
							)
					}
				)
			}
		)
	}