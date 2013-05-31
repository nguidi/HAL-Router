var	Factory
=	function(
		_
	,	HAL
	,	Store
	,	Q
	,	ACL
	,	Models
	)
	{
		return	function(config)
				{
					var	Status_codes
					=	new Models.Status_codes()
					
					this.build_resource
					=	function(req,raw_data,partial)
						{
							console.log("Resource.build_resource")

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
								,	hal_result
								=	_.isDefined(this.store[raw_data.id])
									?	this.store[raw_data.id]
									:	this.create_hal(raw_data,req.session.profile)

								if	(partial)
									deferred
										.resolve(
											HAL.Resource.Partial(hal_result)
										)
								else
									Q.all(
										_.map(
											this.unresolved_assocs(
													hal_result
												)
										,	function(assoc)
											{
												return	assoc.generate_embedded(req,raw_data)
											}
										)
									).then(
										function(embeddeds)
										{
											_.each(
												embeddeds
											,	function(embeded,embeded_key)
												{
													if	(!_.isEmpty(embeded))
														hal_result
															.embed(
																embeded.name
															,	embeded
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

					this.build_collection
					=	function(req,parsed,raw_collection,partial)
						{
							console.log("Resource.build_collection")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							Q.all(
								_.map(
									raw_collection.data
								,	function(data)
									{
										return self.build_resource(req,data,partial)
									}
								)
							).then(
								function(collection)
								{
									deferred
										.resolve(
											new HAL.Collection(
													collection
												,	self.url()
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
							console.log("Resource.show")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							partial
							=	partial
							||	false
							
							Store
								.show(this.name,parsed.id)
								.then(
									function(raw_data)
									{
										console.log("Resource.raw_data")
										self
											.build_resource(req,raw_data,partial)
											.then(
												function(hal_resource)
												{
													console.log("Resource.hal_resource")
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
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
							console.log("Resource.list")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							
							partial
							=	partial
							||	false

							Store
								.list(this.name,parsed.query)
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
															name: self.name
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
							console.log("Resource.filter")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							,	store_func
							=	_.isDefined(parsed.body.through)
								?	'filter_through'
								:	'filter'
							
							partial
							=	partial
							||	false

							Store[store_func](this.name,parsed.body)
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
															name: self.name
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
							console.log("Resource.find")
							var	deferred
							=	Q.defer()
							,	self
							=	this
							,	store_func
							=	parsed.body.through
								?	'find_through'
								:	'find'
							
							partial
							=	partial
							||	false

							Store
								Store[store_func](this.name,parsed.body)
								.then(
									function(raw_data)
									{
										console.log("Resource.raw_data")
										self
											.build_resource(req,raw_data,partial)
											.then(
												function(hal_resource)
												{
													console.log("Resource.hal_resource")
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
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
							console.log("Resource.update")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							Store
								.update(this.name,parsed.id,_.omit(parsed.body,["query","collection_query"]))
								.then(
									function(raw_data)
									{
										self
											.build_resource(req,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
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
							console.log("Resource.delete")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							Store
								.delete(this.name,parsed.id)
								.then(
									function(raw_data)
									{
										self
											.delete_resource(req,parsed.id,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
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
							console.log("Resource.create")
							var	deferred
							=	Q.defer()
							,	self
							=	this

							Store
								.create(this.name,parsed.body.query)
								.then(
									function(raw_data)
									{
										self
											.build_resource(req,raw_data)
											.then(
												function(hal_resource)
												{
													_.extend(
														hal_resource
													,	{
															name: _.str.strLeftBack(self.name,'s')
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
							return	Store.find(this.name,parsed.id)
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
