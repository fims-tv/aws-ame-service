#########################################################
# AWS Variables
#
# Create a file named terraform.tfvars in same directory
# add these parameters to the file
#
# region = "us-east-X"
# access_key = "my aws access key"
# secret_key  = "my aws secret key"
# account_id = "my AWS account id (get it from AWS console under account info)"
#
#########################################################

variable access_key {
  default = "ACCESS KEY"
}

variable secret_key {
  default = "SECRET KEY"
}

variable account_id {
  default = "ACCOUNT ID"
}

variable region {
  default = "REGION"
}



#########################
# Environment Variables
#########################

variable "public-ingest-bucket" {
  default = "public-ingest.bloommberg.us-east-1.dev.fims.tv"
}

variable "repo-bucket" {
  default = "private-repo.bloomberg.us-east-1.dev.fims.tv"
}


variable "public-ai-ingest-bucket" {
  default = "public-ai-ingest.bloommberg.us-east-1.dev.fims.tv"
}


variable "environmentName" {
  default = "fims-loic-ai"
}

variable "environmentType" {
  default = "dev"
}

#########################
# Module registration 
# Run a terraform get on each module before executing this script
#########################

module "service-registry" {
  source = "./service-registry"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "service-registry"

}

module "job-repository" {
  source = "./job-repository"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "job-repo"
}

module "job-processor-service" {
  source = "./job-processor-service"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "job-processor-service"

  serviceRegistryUrl = "${module.service-registry.rest_service_url}"
}

module "ame-service" {
  source = "./ame-service"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "ame-service" 
}


module "ai-service" {
  source = "./ai-service"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "ai-service" 
}


module "transform-service" {
  source = "./transform-service"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "transform-service"

}

module "media-repository" {
  source = "./media-repository"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "media-repo"

}

#######################
# Workflow
#######################


module "workflow" {
  source = "./workflow"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "ingest_wf"


  public-ingest-bucket = "${var.public-ingest-bucket}"
  repo-bucket          = "${var.repo-bucket}"

  serviceRegistryUrl = "${module.service-registry.rest_service_url}"
}


#######################
# Triggers
#######################

module "triggers" {
  source = "./triggers"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  environmentName = "${var.environmentName}"
  environmentType = "${var.environmentType}"
  serviceName = "trigger"


  public-ingest-bucket = "${var.public-ai-ingest-bucket}"
  repo-bucket          = "${var.repo-bucket}"

  serviceRegistryUrl = "${module.service-registry.rest_service_url}"
}



#######################
# Search services
#######################

module "repo-search" {
  source = "./repo-search"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  dynamoDBStreamArn = "${module.media-repository.dynamodb_stream_arn}"

}

module "es-dyna-mediarepo" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.media-repository.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.media-repository.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  dynamoDBStreamArn= "${module.media-repository.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"


}

module "es-dyna-jobrepo" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.job-repository.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.job-repository.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  dynamoDBStreamArn= "${module.job-repository.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}


module "es-dyna-job-processor" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.job-processor-service.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.job-processor-service.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  dynamoDBStreamArn= "${module.job-processor-service.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}



module "es-dyna-job-ame" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.ame-service.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.ame-service.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  dynamoDBStreamArn= "${module.ame-service.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}

module "es-dyna-service-registry" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.service-registry.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.service-registry.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  dynamoDBStreamArn= "${module.service-registry.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}

module "es-dyna-transform-service" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.transform-service.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.transform-service.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  dynamoDBStreamArn= "${module.transform-service.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}


module "es-dyna-ai-service" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.ai-service.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.ai-service.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  dynamoDBStreamArn= "${module.ai-service.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}


#########################
# Output variables
#########################

output publicBucket {
  value = "${var.public-ingest-bucket}"
}

output publicBucketUrl {
  value = "https://s3.amazonaws.com/${var.public-ingest-bucket}"
}

output privateBucket {
  value = "${var.repo-bucket}"
}

output privateBucketUrl {
  value = "https://s3.amazonaws.com/${var.repo-bucket}"
}

output "serviceRegistryUrl" {
  value = "${module.service-registry.rest_service_url}"
}

output "jobRepositoryUrl" {
  value = "${module.job-repository.rest_service_url}"
}

output "jobProcessorServiceUrl" {
  value = "${module.job-processor-service.rest_service_url}"
}

output "ameServiceUrl" {
  value = "${module.ame-service.rest_service_url}"
}

output "transformServiceUrl" {
  value = "${module.transform-service.rest_service_url}"
}

output "mediaRepositoryUrl" {
  value = "${module.media-repository.rest_service_url}"
}

output "AIServiceUrl" { 
  value = "${module.ai-service.rest_service_url}"
}


output "es_domain_id" {
  description = "Unique identifier for the ES domain"
  value       = "${module.repo-search.es_domain_id}" 
}

output "es_endpoint" {
  description = "Domain-specific endpoint used to submit index, search, and data upload requests"
  value       = "${module.repo-search.es_endpoint}" 
}

output "kibana_endpoint" {
  description = "Domain-specific endpoint hosting the kibana portal"
  value       = "${module.repo-search.kibana_endpoint}" 
}