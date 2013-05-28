var	Factory
=	function(
		_
	,	Store
	,	Q
	,	ACL
	)
	{
		return	function(config)
				{
					this.create
					=	function()
						{
							var deferred
							=	Q.defer()
							
							Q.all(
								[
									Store.list(config.acl.roles,{})
								,	Store.list(config.acl.acos,{})
								,	Store.list(config.acl.aros_acos,{})
								,	Store.list(config.acl.aros,{})
								]
							).spread(
								function(roles,acos,aros_acos,aros)
								{					
									_.each(
										roles.data
									,	function(rol)
										{
											//	Agrego Roles
											ACL.addRole(rol.profile)

											_.each(
												_.filter(
													acos.data
												,	function(aco)
													{
														return	_.isEqual(aco.id_profile,rol.id)
													}
												)
											,	function(aco)
												{
													//	Agrego Recurso
													ACL.addResource(aco.model)
													//	Permito sobre el Recurso
													ACL
														.allow(
															rol.profile
														,	aco.model
														,	_.map(
																_.filter(
																	aros_acos.data
																,	function(aros_aco)
																	{
																		return	_.isEqual(aros_aco.id_acl_acos,aco.id) && aros_aco.allow
																	}
																)
															,	function(aro_aco)
																{
																	return	_.find(
																				aros.data
																			,	function(aro)
																				{
																					return	_.isEqual(aro_aco.id_acl_aros,aro.id)
																				}
																			).permission
																}
															)
														)
													//	Denego Sobre el Recurso
													ACL
														.deny(
															rol.profile
														,	aco.model
														,	_.map(
																_.filter(
																	aros_acos.data
																,	function(aros_aco)
																	{
																		return	_.isEqual(aros_aco.id_acl_acos,aco.id) && !aros_aco.allow
																	}
																)
															,	function(aro_aco)
																{
																	return	_.find(
																				aros.data
																			,	function(aro)
																				{
																					return	_.isEqual(aro_aco.id_acl_aros,aro.id)
																				}
																			).permission
																}
															)
														)
												}
											)

											deferred
												.resolve(
													ACL
												)
										}
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
	this['hal']
	=	Factory
else
	module.exports
	=	Factory
