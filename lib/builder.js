var	Factory
=	function(
		_
	,	URL
	,	Q
	,	HAL
	,	Store
	,	ACL
	,	Models
	)
	{
		return	function(config)
				{
					var	Status_codes
					=	new Models.Status_codes()

					this.resolve
					=	function(req,partial)
						{
							console.log("Builder.resolve(FULL)")
							var deferred
							=	Q.defer()
							,	parsed
							=	this.parse_url(req)
							,	self
							=	this

							if	(_.isDefined(parsed.subcollection) && _.isEqual(parsed.method,"GET"))
								parsed
								=	this.parse_url(
											Models.Resources[_.str.capitalize(parsed.target)]
												.assoc_method(
													req
												,	Models.Resources[_.str.capitalize(parsed.collection)]
														.find_assoc(parsed.subcollection)
												,	{
														id:	parsed.id
													}
												)
										)
							var	method
							=	_.isEqual(parsed.method,'GET') || _.isUndefined(parsed.method)
								?	_.isDefined(parsed.id)
										?	'show'
										:	'list'
								:	_.isEqual(parsed.method,'PUT')
									?	'update'
									: 	_.isEqual(parsed.method,'DELETE')
										?	'delete'
										:	parsed.body.action

							ACL
								.query(
									req.session.profile
								||	config.acl.default_profile
								,	parsed.target
								,	_.contains(['show','list'],method)
									?	'view'
									:	method
								,	function(err, allowed)
									{
										if	(allowed)	{
											deferred
												.resolve(
													_.isObject(method)
													?	self[method.body.action](req,parsed,partial)
													:	_.isUndefined(self[method])
														?	Status_codes
																.resolve(
																	_.extend(
																		req
																	,	{
																			status_code: 405
																		}
																	)
																)
														:	self[method](req,parsed,partial)
												)
										} else {
											deferred
												.resolve(
													Status_codes
														.resolve(
															_.extend(
																req
															,	{
																	status_code: 403
																}
															)
														)
												)
										}
									}
								)

							return	deferred.promise
						}

					//	Parse a request url
					this.parse_url
					=	function(req)
						{
							var parsed_url
							=	URL.parse(req.url).pathname
							,	url
							=	_.isNull(parsed_url.match(RegExp('^'+config.server.base+'(.*)$')))
								?	parsed_url
								:	URL.parse(parsed_url.match(RegExp('^'+config.server.base+'(.*)$'))[1]).pathname
							,	splited
							=	url.split('/')
							,	target
							=	Models.Resources[_.str.capitalize(splited[1])].get_assoc_target(splited[3])
							||	splited[1]
							,	collection_query
							=	_.extend(
									_.object(
										['type','ipp','page']
									,	['list',0,1]
									)
								,	_.pick(
										_.isEqual(req.method,'POST')
										?	req.body.collection_query
										||	{}
										:	URL.parse(req.url,true).query
									,	['type','ipp','page']
									)
								)
							_.each(
								['ipp','page']
							,	function(val)
								{
									collection_query[val]
									=	parseInt(collection_query[val])
								}
							)
							return	{
										method:			req.method
									,	url:			req.url
									,	data_url:		url
									,	collection:		splited[1]
									,	id:				splited[2]
									,	subcollection:	splited[3]
									,	body:			_.extend(
															req.body
														,	{
															collection_query: collection_query
															}
														)
									,	query:			collection_query
									,	target:			target
									}
						}

					this.unresolved_assocs
					=	function(parsed,stored)
						{
							console.log("Builder.unresolved_assocs")
							return	_.filter(
										Models.Resources[_.str.capitalize(parsed.target)].associations
									,	function(assoc)
										{
											return	_.isUndefined(stored._data._embedded[assoc.name])
												&&	!_.isEqual(assoc.type,'api') 	
										}
									)
						}

					this.delete_resource
					=	function(req,parsed,raw_data)
						{
							console.log("Builder.delete_resource")
							delete	Models.Resources[_.str.capitalize(parsed.target)].store[parsed.id]

							return	Status_codes
											.resolve(
												_.extend(
													req
												,	{
														status_code: raw_data.code
													}
												)
											)
						}

					this.build_resource
					=	function(req,parsed,raw_data,partial)
						{
							console.log("Builder.build_resource")

							if	(_.isEmpty(raw_data))
								return	Status_codes
											.resolve(
												_.extend(
													req
												,	{
														status_code: 404
													}
												)
											)
							else	{
								var	deferred
								=	Q.defer()
								,	self
								=	this
								,	hal_result
								=	_.isDefined(Models.Resources[_.str.capitalize(parsed.target)].store[raw_data.id])
									?	Models.Resources[_.str.capitalize(parsed.target)].store[raw_data.id]
									:	Models.Resources[_.str.capitalize(parsed.target)].create_hal(raw_data,req.session.profile || config.acl.default_profile)

								if	(partial)
									deferred
										.resolve(
											HAL.Resource.Partial(hal_result)
										)
								else
									Q.all(
										_.map(
											this.unresolved_assocs(
													parsed
												,	hal_result
												)
										,	function(assoc)
											{
												return	self.generate_embedded(req,raw_data,assoc)
											}
										)
									).then(
										function(embeddeds)
										{
											_.each(
												embeddeds
											,	function(embedded,embedded_key)
												{
													if	(!_.isEmpty(embedded) && _.isDefined(embedded.name))
														hal_result
															.embed(
																embedded.name
															,	embedded
															)
												}
											)

											deferred
												.resolve(
													hal_result
												)
										}
									)
								
								return deferred.promise
							}
						}

					this.generate_embedded
					=	function(req,data,assoc)
						{
							console.log("Builder.generate_embedded")
							var	deferred
							=	Q.defer()
							,	avoid_embedded
							=	this.check_req(req,data,assoc)

							deferred
								.resolve(
									_.isUndefined(assoc.embedded) || _.isEqual(assoc.embedded.type,"none") || avoid_embedded
									?	{}
									:	this
											.resolve(
												assoc.create_request(req,data)
											,	_.isEqual(assoc.embedded.type,'partial')
											)
								)

							return	deferred.promise
						}

					this.check_req
					=	function(req,data,assoc)
						{
							var	requested
							=	{
									from:	assoc.source
								,	to:		assoc.target
								,	name:	assoc.name
								,	data:	data
								,	type:	assoc.type
								}
							,	found
							=	_.find(
									req.visited
								,	function(visited)
									{
										if	(
												_.isEqual(visited.from,requested.from)
											&&	_.isEqual(visited.to,requested.to)
											&&	_.isEqual(visited.name,requested.name)
											&&	_.isEqual(visited.type,requested.type)
											)	return 	_.isEqual(visited.data,requested.data)
										else
											if	(
													_.isEqual(visited.from,requested.to)
												&&	_.isEqual(visited.to,requested.from)
												)	return	(_.isEqual(requested.type,'belongs-to') && _.str.include(visited.type,'has-'))
														||	(_.str.include(requested.type,'has-') && _.isEqual(visited.type,'belongs-to'))
											else
												return	false
									}
								)
							if	(_.isUndefined(found))
								req.visited.push(requested)
							return	_.isDefined(found)
						}

					this.build_collection
					=	function(req,parsed,raw_collection,partial)
						{
							console.log("Builder.build_collection")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							Q.all(
								_.map(
									raw_collection.data
								,	function(data)
									{
										return self.build_resource(req,parsed,data,partial)
									}
								)
							).then(
								function(collection)
								{
									deferred
										.resolve(
											new HAL.Collection(
													collection
												,	Models.Resources[_.str.capitalize(parsed.target)].url()
												,	_.extend(
														parsed.body.collection_query
													,	{
															count: raw_collection.count
														}
													)
												)
										)
								}
							)
							
							return deferred.promise
						}

					//	Search a resource in the Store (DB).
					this.show
					=	function(req,parsed,partial)
						{
							console.log("Builder.show")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							partial
							=	partial
							||	false

							Store
								.show(parsed.target,parsed.id)
								.then(
									function(raw_data)
									{
										console.log("Builder.raw_data")
										self
											.build_resource(req,parsed,raw_data,partial)
											.then(
												function(hal_resource)
												{
													console.log("Builder.hal_resource")
													_.extend(
														hal_resource
													,	{
															name:	parsed.subcollection	||	parsed.collection
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return deferred.promise
						}

					//	Search a set of resources from the Store (DB)
					this.list
					=	function(req,parsed,partial)
						{
							console.log("Builder.list")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							partial
							=	partial
							||	false

							Store
								.list(parsed.target,parsed.query)
								.then(
									function(raw_data)
									{
										console.log("Collection.raw_data")
										self
											.build_collection(req,parsed,raw_data,partial)
											.then(
												function(hal_collection)
												{
													console.log("Collection.hal_collection")
													_.extend(
														hal_collection
													,	{
															name:	parsed.subcollection	||	parsed.collection
														}
													)
													deferred
														.resolve(
															hal_collection
														)
												}
											)
									}
								)

							return deferred.promise
						}

					//	Ask the Store (DB) to filter the resource collection given a set of data and add the resources obteined in the local store. If a resource exists in the local store it will be updated.
					this.filter
					=	function(req,parsed,partial)
						{
							console.log("Builder.filter")
							var	deferred
							=	Q.defer()
							,	store_func
							=	_.isDefined(parsed.body.through)
								?	'filter_through'
								:	'filter'
							,	self
							=	this
							
							partial
							=	partial
							||	false

							Store[store_func](parsed.target,parsed.body)
								.then(
									function(raw_data)
									{
										console.log("Collection.raw_data")
										self
											.build_collection(req,parsed,raw_data,partial)
											.then(
												function(hal_collection)
												{
													console.log("Collection.hal_collection")
													_.extend(
														hal_collection
													,	{
															name:	parsed.subcollection	||	parsed.collection
														}
													)
													deferred
														.resolve(
															hal_collection
														)
												}
											)
									}
								)

							return deferred.promise
						}
					
					this.find
					=	function(req,parsed,partial)
						{
							console.log("Builder.find")
							var	deferred
							=	Q.defer()
							,	store_func
							=	parsed.body.through
								?	'find_through'
								:	'find'
							,	self
							=	this
							console.log(parsed)
							partial
							=	partial
							||	false

							Store
								Store[store_func](parsed.target,parsed.body)
								.then(
									function(raw_data)
									{
										console.log("Builder.raw_data",raw_data)
										self
											.build_resource(req,parsed,raw_data,partial)
											.then(
												function(hal_resource)
												{
													console.log("Builder.hal_resource",hal_resource)
													_.extend(
														hal_resource
													,	{
															name:	parsed.subcollection	||	parsed.collection
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return deferred.promise
						}

					//	Ask the Store (DB) to update the given resource and if it exists in the local store it will be updated as well.
					this.update
					=	function(req,parsed)
						{
							console.log("Builder.update")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							
							Store
								.update(parsed.target,parsed.id,_.omit(parsed.body,["query","collection_query"]))
								.then(
									function(raw_data)
									{
										self
											.build_resource(req,parsed,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name:	parsed.subcollection	||	parsed.collection
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return	deferred.promise
						}

					//	Ask the Store (DB) to delete the given resource and if it exists in the local store it will be deleted as well.
					this.delete
					=	function(req,parsed)
						{
							console.log("Builder.delete")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							
							Store
								.delete(parsed.target,parsed.id)
								.then(
									function(raw_data)
									{
										self
											.delete_resource(req,parsed,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name:	parsed.subcollection	||	parsed.collection
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return	deferred.promise
						}

					//	Ask the Store (DB) to create a given resource and if will created in the local store as well.
					this.create
					=	function(req,parsed)
						{
							console.log("Builder.create")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							
							Store
								.create(parsed.target,parsed.body.query)
								.then(
									function(raw_data)
									{
										self
											.build_resource(req,parsed,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name:	parsed.subcollection	||	parsed.collection
														}
													)
													deferred
														.resolve(
															hal_resource
														)
												}
											)
									}
								)

							return	deferred.promise
						}

					//	Ask the Store (DB) to join the given resource using a set of data.
					this.join
					=	function(req,parsed)
						{
							return	Store.find(parsed.target,parsed.id)
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['Builder']
	=	Factory
else
	module.exports
	=	Factory
