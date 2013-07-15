var	Factory
=	function(
		_
	,	HAL
	,	Q
	,	Store
	,	Models
	,	ACL
	,	Builder
	)
	{
		return	function(config)
				{
					var	Status_codes
					=	new Models.Status_codes()

					this.resolve
					=	function(req,api_link)
						{
							var	deferred
							=	Q.defer()

							if	(_.isDefined(this[api_link]))
								this[api_link](req)
									.then(
										function(result)
										{
											deferred
												.resolve(
													result
												)
										}
									)
							else
								deferred
									.resolve(
										Status_codes
											.resolve(
												_.extend(
													req
												,	{
														status_code: 501
													}
												)
											)
									)

							return	deferred.promise
						}

					this.signin
					=	function(req)
						{
							console.log("Application.signin")
							var	deferred
							=	Q.defer()

							if	(_.isEmpty(req.body))
								deferred
									.resolve(
										Status_codes
											.resolve(
												_.extend(
													req
												,	{
														status_code: 400
													}
												)
											)
									)
							else
								Store
									.find(
										config.application.users
									,	req.body
									).then(
										function(user)
										{
											if	(_.isEmpty(user))
												deferred
													.resolve(
														Status_codes
															.resolve(
																_.extend(
																	req
																,	{
																		status_code: 404
																	}
																)
															)
													)
											else	{
												
												req.session.user
												=	user
												
												req.session.profile
												=	ACL.find_role(user.id_profile).name
												
												deferred
													.resolve(
														Builder
															.build_resource(
																req
															,	{
																	target:	_.str.capitalize(config.application.users)
																}
															,	user
															,	false
															)
													)

												// deferred
												// 	.resolve(
												// 		Models
												// 			.Resources[_.str.capitalize(config.application.users)]
												// 				.create_hal(user,ACL.find_role(user.id_profile).name)
												// 	)
											}
										}
									)

							return	deferred.promise
						}

				this.signout
				=	function(req)
					{
						console.log("Application.signout")
						var	deferred
						=	Q.defer()

						req.session
						=	null
						deferred
							.resolve(
								Status_codes
									.resolve(
										_.extend(
											req
										,	{
												status_code: 200
											}
										)
									)
							)

						return	deferred.promise
					}


				this.signup
				=	function(req)
					{
						console.log("Application.signup")
						var	deferred
						=	Q.defer()
						//	VER COMO EVITAR ESTO A TODA COSTA
						req.body.query.id_profile
						=	parseInt(req.body.query.id_profile)
						//	FIN PARCHE FEO
						Store
							.create(
								config.application.users
							,	req.body.query
							).then(
								function(data)
								{
									deferred
										.resolve(
											Status_codes
												.resolve(
													_.extend(
														req
													,	{
															status_code:	200
														}
													)
												)
										)
								}
							,	function(error)
								{
									deferred
										.resolve(
											Status_codes
												.resolve(
													_.extend(
														req
													,	{
															status_code:	400
														}
													)
												)
										)
								}
							)

						return	deferred.promise
					}

				}
	}
if(
	typeof module === 'undefined'
)
	this['ModelBuilder']
	=	Factory
else
	module.exports
	=	Factory


						