# //Dev-s3/providers.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  #profile = var.aws_profile # <- activado # comentado para que no ignore las credenciales temporales de AWS Academy
}

